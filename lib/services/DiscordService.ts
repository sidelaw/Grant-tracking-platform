import database from "@/lib/storage";
import { ActivityLogService } from '@/lib/services/ActivityLogService';
import { REST,  } from '@discordjs/rest';
import { Routes, InteractionType, InteractionResponseType, ApplicationCommandOptionType } from 'discord-api-types/v10';
import { Project, Program } from "@/types";


 class DiscordService {
  private client: REST;
  private activityLogService: ActivityLogService;

  constructor() {
    this.client = new REST({version: '10'}).setToken(process.env.DISCORD_BOT_TOKEN || process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || '');
    this.activityLogService = new ActivityLogService();
  }

async handleInteraction(interaction: DiscordInteraction): Promise<InteractionResponse> {
    try {
      switch (interaction.type) {
        case InteractionType.ApplicationCommand:
          return await this.handleApplicationCommand(interaction);
        
        case InteractionType.ApplicationCommandAutocomplete:
          return await this.handleAutocomplete(interaction);
        
        case InteractionType.MessageComponent:
          return await this.handleMessageComponent(interaction);
        
        case InteractionType.ModalSubmit:
          return await this.handleModalSubmit(interaction);
        
        default:
          return this.createErrorResponse('Unknown interaction type');
      }
    } catch (error) {
      console.error('Error handling interaction:', error);
      return this.createErrorResponse('An error occurred while processing your request');
    }
  }

  /**
   * Handle slash commands and context menu commands
   */
  private async handleApplicationCommand(interaction: DiscordInteraction): Promise<InteractionResponse> {
    if (!interaction.data) {
      return this.createErrorResponse('Invalid command data');
    }

    const { name } = interaction.data;

    switch (name) {
      case 'milestone':
        return await this.handleMilestoneCommand(interaction);
      
      case 'program':
        return await this.handleProjectCommand(interaction);
      
      default:
        return this.createErrorResponse(`Unknown command: ${name}`);
    }
  }

  /**
   * Handle milestone subcommands
   */
  private async handleMilestoneCommand(interaction: DiscordInteraction): Promise<InteractionResponse> {
    const options = interaction.data?.options || [];
    const subcommand = options[0];

    if (!subcommand || subcommand.type !== 1) { // SUB_COMMAND
      return this.createErrorResponse('Invalid milestone subcommand');
    }

    switch (subcommand.name) {
      case 'complete':
        return await this.handleMilestoneComplete(interaction, subcommand.options || []);
      
      case 'progress':
        return await this.handleMilestoneProgress(interaction, subcommand.options || []);
      default:
        return this.createErrorResponse(`Unknown milestone action: ${subcommand.name}`);
    }
  }

  /**
   * Handle milestone completion
   */
  private async handleMilestoneComplete(interaction: DiscordInteraction, options: InteractionOption[]): Promise<InteractionResponse> {
    const milestoneValue = this.getOptionValue(options, 'milestone') as string;
    const notes = this.getOptionValue(options, 'notes') as string | undefined;

    if (!milestoneValue) {
      return this.createErrorResponse('Milestone is required');
    }

    try {
      // Get program from channel
      const program = await database.getProgramByChannelId(interaction.channel_id);
      if (!program) {
        return this.createErrorResponse('This channel is not linked to any program. Use `/project link` to connect it.');
      }

      // Try to find milestone by ID or name
      let milestone = await database.findMilestoneByIdOrName(program.id, milestoneValue);
      
      if (!milestone) {
        return this.createErrorResponse(`Milestone "${milestoneValue}" not found`);
      }

      // Update milestone to completed
      await database.updateMilestone(milestone.id, {
        status: 'completed',
        progress: 100
      });

      // Create activity log
      await this.activityLogService.createDiscordLog(
        program.id,
        'milestone_completed',
        {
          milestone_id: milestone.id,
          milestone_title: milestone.title,
          completion_notes: notes,
          completed_by: this.getUserId(interaction),
          command_used: true
        },
        interaction.id,
        this.getUserId(interaction),
        interaction.channel_id,
        new Date(),
        milestone.id
      );

      // Update program progress
      await database.updateProgramProgress(program.id);

      return this.createSuccessResponse(
        `✅ Milestone "${milestone.title}" marked as completed!${notes ? `\n📝 Notes: ${notes}` : ''}`
      );

    } catch (error) {
      console.error('Error completing milestone:', error);
      return this.createErrorResponse('Failed to complete milestone');
    }
  }

  /**
   * Handle milestone progress update
   */
  private async handleMilestoneProgress(interaction: DiscordInteraction, options: InteractionOption[]): Promise<InteractionResponse> {
    const milestoneValue = this.getOptionValue(options, 'milestone') as string;
    const percentage = this.getOptionValue(options, 'percentage') as number;
    const notes = this.getOptionValue(options, 'notes') as string | undefined;

    if (!milestoneValue || percentage === undefined) {
      return this.createErrorResponse('Milestone and percentage are required');
    }

    try {
      const program = await database.getProgramByChannelId(interaction.channel_id);
      if (!program) {
        return this.createErrorResponse('This channel is not linked to any program.');
      }

      let milestone = await database.findMilestoneByIdOrName(program.id, milestoneValue);

      if (!milestone) {
        return this.createErrorResponse(`Milestone "${milestoneValue}" not found`);
      }

      // Update milestone progress
      const newStatus = percentage >= 100 ? 'completed' : 'pending';
      await database.updateMilestone(milestone.id, {
        progress: percentage,
        status: newStatus
      });

      // Create activity log
      await this.activityLogService.createDiscordLog(
        program.id,
        'milestone_progress',
        {
          milestone_id: milestone.id,
          milestone_title: milestone.title,
          previous_progress: milestone.progress,
          new_progress: percentage,
          progress_notes: notes,
          updated_by: this.getUserId(interaction),
          command_used: true
        },
        interaction.id,
        this.getUserId(interaction),
        interaction.channel_id,
        new Date(),
        milestone.id
      );

      // Update program progress
      await database.updateProgramProgress(program.id);

      const statusEmoji = percentage >= 100 ? '✅' : '📈';
      return this.createSuccessResponse(
        `${statusEmoji} Milestone "${milestone.title}" updated to ${percentage}%${notes ? `\n📝 Notes: ${notes}` : ''}`
      );

    } catch (error) {
      console.error('Error updating milestone progress:', error);
      return this.createErrorResponse('Failed to update milestone progress');
    }
  }


  private async handleProjectCommand(interaction: DiscordInteraction): Promise<InteractionResponse> {
    const options = interaction.data?.options || [];
    const subcommand = options[0];

    if (!subcommand || subcommand.type !== 1) {
      return this.createErrorResponse('Invalid project subcommand');
    }

    switch (subcommand.name) {
      case 'project-status':
        return await this.handleProgramStatus(interaction, options);
      default:
        return this.createErrorResponse(`Unknown project action: ${subcommand.name}`);
    }
  }



  /**
   * Handle program status command
   */
  private async handleProgramStatus(interaction: DiscordInteraction, options: InteractionOption[]): Promise<InteractionResponse> {
    try {
      
    const program = await database.getProgramByChannelId(interaction.channel_id);
    if (!program) {
      return this.createErrorResponse('Project not found');
    }

    // Check if this is a status update command
    const newStatus =  this.getOptionValue(options, 'status') as string;
    
    
      // Authorization checks for status updates
      const userId = interaction.member?.user?.id || interaction.user?.id;
      const username = interaction.member?.user?.username || interaction.user?.username;
      const superuser = process.env.DISCORD_SUPERUSER_USERNAME;

      // Check if user is the program owner
      if (userId !== program.owner_discord_id || username !== superuser) {
        return this.createErrorResponse('Only the program owner or superuser can update the status');
      }

      // Special check: if current status is 'At risk', only superuser can change it to something else
      if (program.status === 'At risk' && newStatus !== 'At risk' && username !== superuser) {
        return this.createErrorResponse('Only the superuser can remove the "At risk" status');
      }

      // Update the status in database
      const updatedProgram = await database.updateProgram(program.id, { status: newStatus as Program['status'] });
      if (!updatedProgram) {
        return this.createErrorResponse('Failed to retrieve updated program');
      }

      // Create success response without emojis for completed status updates
      const embed = this.createStatusUpdateEmbed(updatedProgram);
      
      return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: { 
          content: `✅ Status updated to **${newStatus.toUpperCase()}**`,
          embeds: [embed] 
        }
      };
    // Just display current status
    } catch (error) {
      console.error('Error getting project status:', error);
      return this.createErrorResponse('Failed to get project status');
    }
  }
  private createStatusUpdateEmbed(program: Program): any {
    const isCompleted = program.status === 'completed';
    
    return {
      title: isCompleted ? program.name : `📊 ${program.name}`,
      description: program.description || 'No description',
      color: this.getStatusColor(program.status || 'active'),
      fields: [
        {
          name: isCompleted ? 'Progress' : '🎯 Progress',
          value: `${program.progress || 0}% complete`,
          inline: true
        },
        {
          name: isCompleted ? 'Status' : '📈 Status',
          value: isCompleted 
            ? (program.status || 'active').toUpperCase()
            : `${this.getStatusEmoji(program.status || 'active')} ${(program.status || 'active').toUpperCase()}`,
          inline: true
        },
        {
          name: isCompleted ? 'GitHub' : '🔗 GitHub',
          value: program.github_repo 
            ? `[${program.github_repo}](https://github.com/${program.github_repo})`
            : 'Not specified',
          inline: true
        }
      ],
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Handle autocomplete interactions
   */
  private async handleAutocomplete(interaction: DiscordInteraction): Promise<InteractionResponse> {
    if (!interaction.data?.options) {
      return { type: InteractionResponseType.ApplicationCommandAutocompleteResult, data: { choices: [] } };
    }

    // Find focused option
    const focusedOption = this.findFocusedOption(interaction.data.options);
    
    if (!focusedOption || focusedOption.name !== 'milestone') {
      return { type: InteractionResponseType.ApplicationCommandAutocompleteResult, data: { choices: [] } };
    }

    try {
      const program = await database.getProgramByChannelId(interaction.channel_id);
      if (!program) {
        return { type: InteractionResponseType.ApplicationCommandAutocompleteResult, data: { choices: [] } };
      }

      const milestones = await database.getProgramMilestones(program.id);
  
      const query = (focusedOption.value as string || '').toLowerCase();
      
      const choices = milestones
        .filter(m => m.title.toLowerCase().includes(query))
        .slice(0, 25) // Discord limits to 25 choices
        .map(m => ({
          name: `${m.title} (${m.progress}% - ${m.status})`,
          value: m.id
        }));

      return {
        type: InteractionResponseType.ApplicationCommandAutocompleteResult,
        data: { choices }
      };

    } catch (error) {
      console.error('Error handling autocomplete:', error);
      return { type: InteractionResponseType.ApplicationCommandAutocompleteResult, data: { choices: [] } };
    }
  }
  // /guilds/{guild.id}/members

  /**
   * Fetch all members of a guild
   * @param guildId
   * @return list of guild members
   */
  
 async fetchGuildMembers(guildId: string): Promise<any[]> {
    try {
      const members = await this.client.get(
        Routes.guildMembers(guildId),
      );
      console.log('Fetched guild members:', members);
      return members as any[];
    } catch (error) {
      console.error('Error fetching guild members:', error);
      return [];
    }
  }

  async createGuildChannel(guildId: string, name: string, topic?: string): Promise<any> {
    try {
      const channel = await this.client.post(
        Routes.guildChannels(guildId),
        {
          body: {
            name,
            type: 0, // Text channel
            topic: topic || '',
            permission_overwrites: [],
            nsfw: false,
            rate_limit_per_user: 0,
            parent_id: null,
            position: 0
          }
        }
      );
      return channel;
    } catch (error) {
      console.error('Error creating guild channel:', error);
      return null;
    }
  }

  async listGuildChannels(guildId: string): Promise<any[]> {
    try {
      const channels = await this.client.get(
        Routes.guildChannels(guildId),
      );
      return channels as any[];

    } catch (error) {
      console.error('Error listing guild channels:', error);
      return [];
    }
  }

  /**
   * Handle message component interactions (buttons, select menus)
   */
  private async handleMessageComponent(interaction: DiscordInteraction): Promise<InteractionResponse> {
    // Implementation for buttons and select menus
    return this.createErrorResponse('Message components not implemented yet');
  }

  /**
   * Handle modal submit interactions
   */
  private async handleModalSubmit(interaction: DiscordInteraction): Promise<InteractionResponse> {
    // Implementation for modal forms
    return this.createErrorResponse('Modal submissions not implemented yet');
  }

  


  // Utility methods
  private getOptionValue(options: InteractionOption[], name: string): any {
    const option = options.find(opt => opt.name === name);
    return option?.value;
  }

  private findFocusedOption(options: InteractionOption[]): InteractionOption | null {
    for (const option of options) {
      if (option.focused) return option;
      if (option.options) {
        const found = this.findFocusedOption(option.options);
        if (found) return found;
      }
    }
    return null;
  }

  private getUserId(interaction: DiscordInteraction): string {
    return interaction.member?.user?.id || interaction.user?.id || '';
  }


  private isValidDate(dateString: string): boolean {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateString)) return false;
    
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
  }

  private getStatusEmoji(status: string): string {
    const emojis: { [key: string]: string } = {
      pending: '⏳',
      completed: '✅',
      delayed: '⚠️',
      active: '🔄',
      planning: '📋',
      review: '👀',
      At_risk: '🚩'
    };
    return emojis[status] || '❓';
  }

  private getSourceEmoji(source: string): string {
    const emojis: { [key: string]: string } = {
      github: '🐙',
      discord: '💬',
      manual: '✏️',
      twitter: '🐦',
      telegram: '📱'
    };
    return emojis[source] || '📝';
  }

  private getStatusColor(status: string): number {
    const colors: { [key: string]: number } = {
      active: 0x5865F2, // Blue
      completed: 0x57F287, // Green
      delayed: 0xED4245, // Red
      pending: 0xFEE75C, // Yellow
      planning: 0x9CA3AF, // Gray
      review: 0xEB459E, // Pink
      At_risk: 0xFFA500  // Orange

    };
    return colors[status] || 0x5865F2;
  }

  private createSuccessResponse(content: string, ephemeral: boolean = false): InteractionResponse {
    return {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        content,
        flags: ephemeral ? 64 : 0
      }
    };
  }

  private createErrorResponse(content: string): InteractionResponse {
    return {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        content: `❌ ${content}`,
        flags: 64 // Ephemeral
      }
    };
  }


  async getCommands(guildId?: string): Promise<any> {
      try {
          if (guildId) {
              const data =  await this.client.get(
                  Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID!, guildId)
              );
              return data;
          }
      } catch (error) {
          console.error('Error fetching commands:', error);
      }
  }
  async deleteCommands(guildId?: string): Promise<void> {
      try {
          if (guildId) {
              const commands = await this.getCommands(guildId);
              for (const command of commands) {
                  await this.client.delete(
                      Routes.applicationGuildCommand(process.env.DISCORD_CLIENT_ID!, guildId, command.id)
                  );
                  console.log(`🗑️ Deleted command ${command.name} (${command.id}) from guild ${guildId}`);
              }
          }
      } catch (error) {
          console.error('Error deleting commands:', error);
      }
  }
}

interface DiscordInteraction {
  id: string;
  application_id: string;
  type: InteractionType;
  data?: {
    id: string;
    name: string;
    type: number;
    options?: InteractionOption[];
    guild_id?: string;
  };
  guild_id?: string;
  channel_id: string;
  member?: {
    user: {
      id: string;
      username: string;
      discriminator: string;
      global_name?: string;
    };
    permissions: string;
  };
  user?: {
    id: string;
    username: string;
    discriminator: string;
    global_name?: string;
  };
  token: string;
  version: number;
}

interface InteractionOption {
  name: string;
  type: ApplicationCommandOptionType;
  value?: any;
  options?: InteractionOption[];
  focused?: boolean;
}

interface InteractionResponse {
  type: InteractionResponseType;
  data?: {
    content?: string;
    embeds?: any[];
    components?: any[];
    flags?: number;
    choices?: { name: string; value: string | number }[];
  };
}

const discordService = new DiscordService();
export default discordService;