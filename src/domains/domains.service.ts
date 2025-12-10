import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { promises as dns } from 'dns';
import {
  SESClient,
  VerifyDomainIdentityCommand,
  VerifyDomainDkimCommand,
  GetIdentityVerificationAttributesCommand,
  DeleteIdentityCommand,
  GetIdentityDkimAttributesCommand,
} from '@aws-sdk/client-ses';
import { Domain, VerificationStatus } from './entities/domain.entity';

@Injectable()
export class DomainsService {
  private readonly ses: SESClient;
  private readonly logger = new Logger(DomainsService.name);

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Domain)
    private readonly domainRepository: Repository<Domain>,
  ) {
    const region = this.configService.get<string>('AWS_REGION');
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY');

    this.ses = new SESClient({
      region,
      credentials: {
        accessKeyId: accessKeyId || '',
        secretAccessKey: secretAccessKey || '',
      },
    });
  }

  /**
   * List all domains for a user from the database
   */
  async listDomains(userId: string): Promise<Domain[]> {
    return this.domainRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Verify a new domain and save to database
   */
  async verifyDomain(userId: string, domainName: string): Promise<Domain> {
    // Check if domain already exists for this user
    const existing = await this.domainRepository.findOne({
      where: { userId, domain: domainName },
    });

    if (existing) {
      throw new ConflictException('Domain already exists for this user');
    }

    try {
      // 1. Verify Domain Identity (returns TXT record)
      const verifyIdentityCmd = new VerifyDomainIdentityCommand({ Domain: domainName });
      const identityResult = await this.ses.send(verifyIdentityCmd);

      // 2. Verify DKIM (returns CNAME records)
      const verifyDkimCmd = new VerifyDomainDkimCommand({ Domain: domainName });
      const dkimResult = await this.ses.send(verifyDkimCmd);

      // 3. Save to database
      const domain = this.domainRepository.create({
        userId,
        domain: domainName,
        verificationToken: identityResult.VerificationToken || null,
        dkimTokens: dkimResult.DkimTokens || null,
        verificationStatus: 'Pending',
        dkimVerificationStatus: 'Pending',
      });

      return this.domainRepository.save(domain);
    } catch (error) {
      this.logger.error(`Failed to verify domain ${domainName}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get a domain by ID or domain name for a user
   */
  async findOne(userId: string, domainId: string): Promise<Domain> {
    const domain = await this.domainRepository.findOne({
      where: { id: domainId, userId },
    });

    if (!domain) {
      throw new NotFoundException('Domain not found');
    }

    return domain;
  }

  /**
   * Get a domain by domain name for a user
   */
  async findByDomainName(userId: string, domainName: string): Promise<Domain> {
    const domain = await this.domainRepository.findOne({
      where: { domain: domainName, userId },
    });

    if (!domain) {
      throw new NotFoundException('Domain not found');
    }

    return domain;
  }

  /**
   * Refresh verification status from AWS SES and update database
   */
  async refreshDomainStatus(userId: string, domainId: string): Promise<Domain> {
    const domain = await this.findOne(userId, domainId);

    try {
      // Get Verification Attributes from AWS
      const verifyAttrsCmd = new GetIdentityVerificationAttributesCommand({
        Identities: [domain.domain],
      });
      const verifyResult = await this.ses.send(verifyAttrsCmd);
      const verifyAttrs = verifyResult.VerificationAttributes?.[domain.domain];

      // Get DKIM Attributes from AWS
      const dkimAttrsCmd = new GetIdentityDkimAttributesCommand({
        Identities: [domain.domain],
      });
      const dkimResult = await this.ses.send(dkimAttrsCmd);
      const dkimAttrs = dkimResult.DkimAttributes?.[domain.domain];

      // Update database
      domain.verificationStatus = (verifyAttrs?.VerificationStatus as VerificationStatus) || 'NotStarted';
      domain.dkimVerificationStatus = (dkimAttrs?.DkimVerificationStatus as VerificationStatus) || 'NotStarted';
      domain.lastCheckedAt = new Date();

      // Update tokens if available (they shouldn't change, but just in case)
      if (verifyAttrs?.VerificationToken) {
        domain.verificationToken = verifyAttrs.VerificationToken;
      }
      if (dkimAttrs?.DkimTokens) {
        domain.dkimTokens = dkimAttrs.DkimTokens;
      }

      return this.domainRepository.save(domain);
    } catch (error) {
      this.logger.error(`Failed to refresh status for ${domain.domain}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Set a domain as the default sending domain for a user
   */
  async setDefault(userId: string, domainId: string): Promise<Domain> {
    // Unset current default
    await this.domainRepository.update(
      { userId, isDefault: true },
      { isDefault: false },
    );

    // Set new default
    const domain = await this.findOne(userId, domainId);
    domain.isDefault = true;
    return this.domainRepository.save(domain);
  }

  /**
   * Delete a domain from both AWS SES and database
   */
  async deleteDomain(userId: string, domainId: string): Promise<void> {
    const domain = await this.findOne(userId, domainId);

    try {
      // Delete from AWS SES
      const command = new DeleteIdentityCommand({ Identity: domain.domain });
      await this.ses.send(command);
    } catch (error) {
      this.logger.warn(`Failed to delete from SES (might not exist): ${error.message}`);
      // Continue to delete from database anyway
    }


    // Delete from database
    await this.domainRepository.delete({ id: domainId, userId });
  }

  /**
   * Validate DNS records for a domain
   */
  async validateDNS(userId: string, domainId: string): Promise<{
    domain: string;
    txtRecord: {
      expected: string;
      actual: string[] | null;
      isValid: boolean;
    };
    dkimRecords: Array<{
      name: string;
      expected: string;
      actual: string[] | null;
      isValid: boolean;
    }>;
  }> {
    const domain = await this.findOne(userId, domainId);

    const result = {
      domain: domain.domain,
      txtRecord: {
        expected: domain.verificationToken || '',
        actual: null as string[] | null,
        isValid: false,
      },
      dkimRecords: [] as Array<{
        name: string;
        expected: string;
        actual: string[] | null;
        isValid: boolean;
      }>,
    };

    try {
      // Check TXT record for domain verification
      const txtHost = `_amazonses.${domain.domain}`;
      try {
        const txtRecords = await dns.resolveTxt(txtHost);
        result.txtRecord.actual = txtRecords.flat();
        result.txtRecord.isValid = result.txtRecord.actual.includes(domain.verificationToken || '');
      } catch (error) {
        this.logger.warn(`TXT record not found for ${txtHost}`);
      }

      // Check DKIM CNAME records
      if (domain.dkimTokens) {
        for (const token of domain.dkimTokens) {
          const dkimHost = `${token}._domainkey.${domain.domain}`;
          const expectedValue = `${token}.dkim.amazonses.com`;
          
          const dkimResult = {
            name: dkimHost,
            expected: expectedValue,
            actual: null as string[] | null,
            isValid: false,
          };

          try {
            const cnameRecords = await dns.resolveCname(dkimHost);
            dkimResult.actual = cnameRecords;
            dkimResult.isValid = cnameRecords.some(r => r === expectedValue || r === `${expectedValue}.`);
          } catch (error) {
            this.logger.warn(`CNAME record not found for ${dkimHost}`);
          }

          result.dkimRecords.push(dkimResult);
        }
      }
    } catch (error) {
      this.logger.error(`DNS validation error: ${error.message}`);
    }

    return result;
  }
}

