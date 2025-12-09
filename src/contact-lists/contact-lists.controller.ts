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
  Res,
  Header,
} from '@nestjs/common';
import type { Response } from 'express';
import { ContactListsService } from './contact-lists.service';
import {
  CreateListDto,
  UpdateListDto,
  ManageContactsDto,
  QueryListsDto,
  QueryListDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/decorators/current-user.decorator';

@Controller('contact-lists')
@UseGuards(JwtAuthGuard)
export class ContactListsController {
  constructor(private readonly contactListsService: ContactListsService) {}

  /**
   * POST /api/contact-lists
   * Create a new contact list
   */
  @Post()
  async create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateListDto,
  ) {
    return this.contactListsService.create(user.id, dto);
  }

  /**
   * GET /api/contact-lists
   * List all contact lists
   */
  @Get()
  async findAll(
    @CurrentUser() user: AuthUser,
    @Query() query: QueryListsDto,
  ) {
    return this.contactListsService.findAll(user.id, query);
  }

  /**
   * GET /api/contact-lists/:id
   * Get a single contact list with optional contacts
   */
  @Get(':id')
  async findOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: QueryListDto,
  ) {
    return this.contactListsService.findOne(user.id, id, query);
  }

  /**
   * PATCH /api/contact-lists/:id
   * Update a contact list
   */
  @Patch(':id')
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateListDto,
  ) {
    return this.contactListsService.update(user.id, id, dto);
  }

  /**
   * DELETE /api/contact-lists/:id
   * Delete a contact list (contacts remain)
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.contactListsService.remove(user.id, id);
    return { message: 'Contact list deleted successfully' };
  }

  /**
   * POST /api/contact-lists/:id/contacts
   * Add contacts to a list
   */
  @Post(':id/contacts')
  async addContacts(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ManageContactsDto,
  ) {
    return this.contactListsService.addContacts(user.id, id, dto);
  }

  /**
   * DELETE /api/contact-lists/:id/contacts
   * Remove contacts from a list
   */
  @Delete(':id/contacts')
  @HttpCode(HttpStatus.OK)
  async removeContacts(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ManageContactsDto,
  ) {
    return this.contactListsService.removeContacts(user.id, id, dto);
  }

  /**
   * GET /api/contact-lists/:id/export
   * Export list contacts as CSV
   */
  @Get(':id/export')
  async exportCsv(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const { csv, filename } = await this.contactListsService.exportCsv(user.id, id);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }
}
