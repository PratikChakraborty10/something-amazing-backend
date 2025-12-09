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
import { CampaignsService } from './campaigns.service';
import {
  CreateCampaignDto,
  UpdateCampaignDto,
  QueryCampaignsDto,
  ScheduleCampaignDto,
  SendTestDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/decorators/current-user.decorator';

@Controller('campaigns')
@UseGuards(JwtAuthGuard)
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  /**
   * POST /api/campaigns
   * Create a new campaign
   */
  @Post()
  async create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateCampaignDto,
  ) {
    return this.campaignsService.create(user.id, dto);
  }

  /**
   * GET /api/campaigns
   * List all campaigns with pagination and filters
   */
  @Get()
  async findAll(
    @CurrentUser() user: AuthUser,
    @Query() query: QueryCampaignsDto,
  ) {
    return this.campaignsService.findAll(user.id, query);
  }

  /**
   * GET /api/campaigns/:id
   * Get a single campaign by ID
   */
  @Get(':id')
  async findOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.campaignsService.findOne(user.id, id);
  }

  /**
   * PATCH /api/campaigns/:id
   * Update a campaign
   */
  @Patch(':id')
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCampaignDto,
  ) {
    return this.campaignsService.update(user.id, id, dto);
  }

  /**
   * DELETE /api/campaigns/:id
   * Delete a campaign (drafts only)
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.campaignsService.remove(user.id, id);
  }

  /**
   * POST /api/campaigns/:id/duplicate
   * Duplicate a campaign
   */
  @Post(':id/duplicate')
  async duplicate(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.campaignsService.duplicate(user.id, id);
  }

  /**
   * POST /api/campaigns/:id/send
   * Send a campaign immediately
   */
  @Post(':id/send')
  @HttpCode(HttpStatus.ACCEPTED)
  async send(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.campaignsService.send(user.id, id);
  }

  /**
   * POST /api/campaigns/:id/schedule
   * Schedule a campaign for later
   */
  @Post(':id/schedule')
  async schedule(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ScheduleCampaignDto,
  ) {
    return this.campaignsService.schedule(user.id, id, dto);
  }

  /**
   * POST /api/campaigns/:id/pause
   * Pause a sending or scheduled campaign
   */
  @Post(':id/pause')
  async pause(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.campaignsService.pause(user.id, id);
  }

  /**
   * POST /api/campaigns/:id/resume
   * Resume a paused campaign
   */
  @Post(':id/resume')
  async resume(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.campaignsService.resume(user.id, id);
  }

  /**
   * GET /api/campaigns/:id/analytics
   * Get campaign analytics
   */
  @Get(':id/analytics')
  async getAnalytics(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.campaignsService.getAnalytics(user.id, id);
  }

  /**
   * POST /api/campaigns/:id/test
   * Send a test email
   */
  @Post(':id/test')
  async sendTest(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SendTestDto,
  ) {
    return this.campaignsService.sendTestEmail(user.id, id, dto);
  }
}
