import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { EmailTemplatesService } from './email-templates.service';
import { QueryTemplatesDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('email-templates')
@UseGuards(JwtAuthGuard)
export class EmailTemplatesController {
  constructor(private readonly templatesService: EmailTemplatesService) {}

  /**
   * GET /api/email-templates
   * List all templates (without full content)
   */
  @Get()
  async findAll(@Query() query: QueryTemplatesDto) {
    return this.templatesService.findAll(query);
  }

  /**
   * GET /api/email-templates/categories
   * Get all available categories
   */
  @Get('categories')
  async getCategories() {
    return this.templatesService.getCategories();
  }

  /**
   * GET /api/email-templates/:id
   * Get a single template with full content
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.templatesService.findOne(id);
  }
}
