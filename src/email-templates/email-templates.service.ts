import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { EmailTemplate } from './entities/email-template.entity';
import { QueryTemplatesDto } from './dto';

/**
 * Default email templates to seed the database
 */
const DEFAULT_TEMPLATES: Partial<EmailTemplate>[] = [
  {
    id: 'welcome-email',
    name: 'Welcome Email',
    description: 'A warm welcome email for new subscribers',
    category: 'Onboarding',
    tags: ['welcome', 'onboarding', 'new-user'],
    content: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #333; margin-bottom: 20px;">Welcome aboard, {{firstName}}! 🎉</h1>
  
  <p style="font-size: 16px; line-height: 1.6; color: #555;">
    Thank you for joining us! We're thrilled to have you as part of our community.
  </p>
  
  <p style="font-size: 16px; line-height: 1.6; color: #555;">
    Here's what you can expect from us:
  </p>
  
  <ul style="font-size: 16px; line-height: 1.8; color: #555;">
    <li>Exclusive updates and announcements</li>
    <li>Helpful tips and resources</li>
    <li>Special offers just for subscribers</li>
  </ul>
  
  <div style="margin: 30px 0;">
    <a href="#" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
      Get Started
    </a>
  </div>
  
  <p style="font-size: 14px; color: #888; margin-top: 40px;">
    If you have any questions, just reply to this email—we're always happy to help!
  </p>
  
  <p style="font-size: 14px; color: #888;">
    Best regards,<br>
    The Team
  </p>
</div>
    `.trim(),
  },
  {
    id: 'product-announcement',
    name: 'Product Announcement',
    description: 'Announce new features or products to your audience',
    category: 'Marketing',
    tags: ['product', 'announcement', 'launch', 'marketing'],
    content: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #333; margin-bottom: 20px;">Exciting News, {{firstName}}! 🚀</h1>
  
  <p style="font-size: 16px; line-height: 1.6; color: #555;">
    We've been working hard on something special, and we're excited to finally share it with you!
  </p>
  
  <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
    <h2 style="color: #333; margin-top: 0;">Introducing [Product Name]</h2>
    <p style="color: #555; margin-bottom: 0;">
      [Brief description of the product or feature and its benefits]
    </p>
  </div>
  
  <h3 style="color: #333;">Key Features:</h3>
  <ul style="font-size: 16px; line-height: 1.8; color: #555;">
    <li>Feature 1: [Description]</li>
    <li>Feature 2: [Description]</li>
    <li>Feature 3: [Description]</li>
  </ul>
  
  <div style="margin: 30px 0;">
    <a href="#" style="background-color: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
      Learn More
    </a>
  </div>
  
  <p style="font-size: 14px; color: #888; margin-top: 40px;">
    Have questions? We'd love to hear from you!
  </p>
</div>
    `.trim(),
  },
  {
    id: 'newsletter',
    name: 'Newsletter',
    description: 'A clean newsletter template for regular updates',
    category: 'Newsletter',
    tags: ['newsletter', 'update', 'digest'],
    content: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #333; margin-bottom: 10px;">Weekly Update</h1>
  <p style="color: #888; margin-top: 0;">Your digest for this week</p>
  
  <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
  
  <h2 style="color: #333; font-size: 18px;">📰 Top Stories</h2>
  
  <div style="margin-bottom: 20px;">
    <h3 style="color: #333; font-size: 16px; margin-bottom: 5px;">Story Title 1</h3>
    <p style="color: #555; font-size: 14px; margin: 0;">
      Brief description of the story or article...
    </p>
    <a href="#" style="color: #4F46E5; font-size: 14px;">Read more →</a>
  </div>
  
  <div style="margin-bottom: 20px;">
    <h3 style="color: #333; font-size: 16px; margin-bottom: 5px;">Story Title 2</h3>
    <p style="color: #555; font-size: 14px; margin: 0;">
      Brief description of the story or article...
    </p>
    <a href="#" style="color: #4F46E5; font-size: 14px;">Read more →</a>
  </div>
  
  <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
  
  <h2 style="color: #333; font-size: 18px;">💡 Quick Tips</h2>
  <ul style="font-size: 14px; line-height: 1.8; color: #555;">
    <li>Tip 1</li>
    <li>Tip 2</li>
    <li>Tip 3</li>
  </ul>
  
  <p style="font-size: 14px; color: #888; margin-top: 40px; text-align: center;">
    Thanks for reading, {{firstName}}!
  </p>
</div>
    `.trim(),
  },
  {
    id: 'promotional',
    name: 'Promotional Offer',
    description: 'Eye-catching promotional email with a special offer',
    category: 'Marketing',
    tags: ['promo', 'sale', 'discount', 'offer', 'marketing'],
    content: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; text-align: center;">
  <h1 style="color: #EF4444; margin-bottom: 10px;">🎁 SPECIAL OFFER</h1>
  
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 30px; margin: 20px 0;">
    <h2 style="color: white; font-size: 42px; margin: 0;">50% OFF</h2>
    <p style="color: rgba(255,255,255,0.9); font-size: 18px; margin: 10px 0;">
      For a limited time only!
    </p>
  </div>
  
  <p style="font-size: 16px; color: #555; margin: 20px 0;">
    Hey {{firstName}}, we're offering an exclusive discount just for you!
  </p>
  
  <p style="font-size: 14px; color: #888; margin-bottom: 30px;">
    Use code <strong style="color: #333;">SAVE50</strong> at checkout
  </p>
  
  <a href="#" style="background-color: #EF4444; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
    Shop Now
  </a>
  
  <p style="font-size: 12px; color: #888; margin-top: 40px;">
    *Offer expires in 48 hours. Terms and conditions apply.
  </p>
</div>
    `.trim(),
  },
];

@Injectable()
export class EmailTemplatesService implements OnModuleInit {
  constructor(
    @InjectRepository(EmailTemplate)
    private readonly templateRepository: Repository<EmailTemplate>,
  ) {}

  /**
   * Seed default templates on module initialization
   */
  async onModuleInit() {
    await this.seedDefaultTemplates();
  }

  /**
   * Seed default templates if they don't exist
   */
  private async seedDefaultTemplates(): Promise<void> {
    for (const template of DEFAULT_TEMPLATES) {
      const existing = await this.templateRepository.findOne({
        where: { id: template.id },
      });

      if (!existing) {
        await this.templateRepository.save(
          this.templateRepository.create(template),
        );
      }
    }
  }

  /**
   * Find all templates with optional filtering
   */
  async findAll(
    query: QueryTemplatesDto,
  ): Promise<{ data: Omit<EmailTemplate, 'content'>[] }> {
    const { category, search } = query;

    const queryBuilder = this.templateRepository
      .createQueryBuilder('template');

    if (category) {
      queryBuilder.andWhere('template.category = :category', { category });
    }

    if (search) {
      queryBuilder.andWhere(
        '(template.name ILIKE :search OR template.tags::text ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    queryBuilder.orderBy('template.name', 'ASC');

    const templates = await queryBuilder.getMany();

    // Return without full content for listing
    return {
      data: templates.map(({ content, ...rest }) => rest),
    };
  }

  /**
   * Find a single template by ID with full content
   */
  async findOne(id: string): Promise<EmailTemplate> {
    const template = await this.templateRepository.findOne({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    return template;
  }

  /**
   * Get all available categories
   */
  async getCategories(): Promise<string[]> {
    const result = await this.templateRepository
      .createQueryBuilder('template')
      .select('DISTINCT template.category', 'category')
      .orderBy('template.category', 'ASC')
      .getRawMany();

    return result.map((r) => r.category);
  }
}
