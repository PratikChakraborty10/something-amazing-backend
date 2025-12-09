import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ContactsService } from './contacts.service';
import {
  CreateContactDto,
  UpdateContactDto,
  BulkImportDto,
  BulkDeleteDto,
  QueryContactsDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/decorators/current-user.decorator';

@Controller('contacts')
@UseGuards(JwtAuthGuard)
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  /**
   * POST /api/contacts
   * Create a single contact
   */
  @Post()
  async create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateContactDto,
  ) {
    return this.contactsService.create(user.id, dto);
  }

  /**
   * POST /api/contacts/bulk
   * Bulk import contacts
   */
  @Post('bulk')
  async bulkImport(
    @CurrentUser() user: AuthUser,
    @Body() dto: BulkImportDto,
  ) {
    return this.contactsService.bulkImport(user.id, dto);
  }

  /**
   * GET /api/contacts
   * List contacts with pagination, filtering, and search
   */
  @Get()
  async findAll(
    @CurrentUser() user: AuthUser,
    @Query() query: QueryContactsDto,
  ) {
    return this.contactsService.findAll(user.id, query);
  }

  /**
   * GET /api/contacts/stats
   * Get contact statistics
   */
  @Get('stats')
  async getStats(@CurrentUser() user: AuthUser) {
    return this.contactsService.getStats(user.id);
  }

  /**
   * GET /api/contacts/:id
   * Get a single contact by ID
   */
  @Get(':id')
  async findOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.contactsService.findOne(user.id, id);
  }

  /**
   * PATCH /api/contacts/:id
   * Update a contact
   */
  @Patch(':id')
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateContactDto,
  ) {
    return this.contactsService.update(user.id, id, dto);
  }

  /**
   * DELETE /api/contacts/:id
   * Delete a single contact
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.contactsService.remove(user.id, id);
    return { message: 'Contact deleted successfully' };
  }

  /**
   * DELETE /api/contacts/bulk
   * Delete multiple contacts
   */
  @Delete('bulk')
  @HttpCode(HttpStatus.OK)
  async bulkRemove(
    @CurrentUser() user: AuthUser,
    @Body() dto: BulkDeleteDto,
  ) {
    const result = await this.contactsService.bulkRemove(user.id, dto);
    return {
      deleted: result.deleted,
      message: `${result.deleted} contact(s) deleted successfully`,
    };
  }
}
