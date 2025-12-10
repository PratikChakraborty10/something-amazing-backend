import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { DomainsService } from './domains.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/decorators/current-user.decorator';

@Controller('domains')
@UseGuards(JwtAuthGuard)
export class DomainsController {
  constructor(private readonly domainsService: DomainsService) {}

  @Get()
  async listDomains(@CurrentUser() user: AuthUser) {
    return this.domainsService.listDomains(user.id);
  }

  @Post()
  async verifyDomain(
    @CurrentUser() user: AuthUser,
    @Body('domain') domain: string,
  ) {
    return this.domainsService.verifyDomain(user.id, domain);
  }

  @Get(':id')
  async getDomain(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.domainsService.findOne(user.id, id);
  }

  @Patch(':id/refresh')
  async refreshDomainStatus(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.domainsService.refreshDomainStatus(user.id, id);
  }

  @Patch(':id/set-default')
  async setDefault(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.domainsService.setDefault(user.id, id);
  }

  @Get(':id/validate-dns')
  async validateDNS(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.domainsService.validateDNS(user.id, id);
  }

  @Delete(':id')
  async deleteDomain(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.domainsService.deleteDomain(user.id, id);
    return { message: 'Domain deleted successfully' };
  }
}
