export interface Program {
  id: string; // UUID
  name: string;
  description?: string;
  type: ProgramType;
  grantee: string;
  grantee_email: string;
  category: string;
  budget: number;
  duration: number; // in days
  status: ProgramStatusType;
  progress: number; // 0-100
  github_repo: string; // GitHub repository (owner/repo)
  funds_spent?: number;
  discord_channel_id: string;
  created_at: string;
  owner_discord_id: string;
  updated_at: string;
  last_upstring?: string;
  next_upstring?: string;
  avatar_src?: string;
  avatar_bg?: string;
  wallet_address?: string;
  location?: string;
  star_rating?: number; // 1-5
  vp_amount?: string; // Voting Power amount
  start_date: string;
  url: string; // Must be unique
}

// Project interface (only for project_based programs)
export interface Project {
  id: string; // UUID
  program_id: string; // References programs table
  name: string;
  description?: string;
  budget?: number;
  status: StatusType;
  progress: number; // 0-100
  github_repo?: string;
  funds_spent?: number;
  created_at: string;
  updated_at: string;
  start_date?: string;
}

// Milestone interface (only for milestone_based programs)
export interface Milestone {
  id: string; // UUID
  program_id: string; // References programs table (not projects!)
  title: string;
  budget: number;
  funds_spent?: number;
  description?: string;
  due_date?: string;
  status: MilestoneStatus;
  progress: number; // 0-100
  completion_string?: string;
  created_at: string;
  updated_at: string;
}

// updated Activity Log interface
export interface ActivityLog {
  id?: string; // UUID
  program_id: string; // Always required
  project_id?: string; // Only for project_based programs
  milestone_id?: string; // Only for milestone_based programs
  source: ActivitySource;
  type: LogType;
  content: any; // JSONB - flexible content based on type
  url?: string; // Link to PR/commit/Discord msg
  timestamp: string;
  user_github?: string;
  user_discord?: string;
}

// updated Review interface
export interface Review {
  id: string;
  program_id: string; // References programs table now
  reviewer: string;
  review_text?: string;
  created_at: string;
}

// updated Payout interface
export interface Payout {
  id: string;
  program_id: string; // References programs table now
  amount: number; // DECIMAL(10,2)
  released_at?: string;
  created_at: string;
}

// Helper types for better type safety
export type ProgramType = 'project_based' | 'milestone_based';
export type StatusType = 'active' | 'planning' | 'review' | 'completed' | 'delayed' | 'paused';
export type ProgramStatusType = 'At risk' | 'active' | 'paused' | 'completed';
export type MilestoneStatus = 'pending' | 'completed' | 'delayed';
export type ActivitySource = 'github' | 'discord' | 'telegram' | 'twitter' | 'manual';
export type LogType = 'commit' | 'pull_request' | 'issue' | 'announcement' | 'milestone_upstring' | 'milestone_completed' | 'project_upstring' | 'general' | 'milestone_progress';

// GitHub specific interfaces for processing (unchanged)
export interface GitHubCommitData {
  sha: string;
  message: string;
  author: string;
  email: string;
  date: string;
  html_url: string;
  additions: number;
  deletions: number;
  files: string[];
  repository: string;
}

export interface GitHubPRData {
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed';
  merged: boolean;
  author: string;
  created_at: string;
  html_url: string;
  updated_at: string;
  merged_at?: string;
  repository: string;
}

export interface GitHubIssueData {
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed';
  author: string;
  html_url: string;
  labels: string[];
  created_at: string;
  updated_at: string;
  closed_at?: string;
  repository: string;
}

export interface GitHubWebhookPayload {
  action?: string;
  commits?: Array<{
    message: string;
    url: string;
  }>;
  head_commit?: {
    timestamp: string;
  };
  pull_request?: {
    title: string;
    html_url: string;
    created_at: string;
  };
  issue?: {
    title: string;
    html_url: string;
    created_at: string;
  };
}

export interface DiscordWebhookPayload {
  content: string;
  author: {
    username: string;
    id: string;
  };
  channel_id: string;
  guild_id?: string;
  id: string;
  timestamp?: string;
}

// Utility interfaces for working with the hierarchical structure
export interface ProgramWithProjects extends Program {
  type: 'project_based';
  projects?: Project[];
}

export interface ProgramWithMilestones extends Program {
  type: 'milestone_based';
  milestones?: Milestone[];
}

// Union type for programs with their children
export type ProgramWithChildren = ProgramWithProjects | ProgramWithMilestones;

export interface RepoActivityCheck {
  isAbandoned: boolean;
  lastActivitystring: string | null;
  daysSinceLastActivity: number;
};

export interface DiscordChannel {
  id: string;
  name: string;
  type: number;
}

export interface DiscordMember {
    avatar: string | null;
    banner: string | null;
    communication_disabled_until: string | null;
    flags: number;
    joined_at: string;
    nick: string | null;
    pending: boolean;
    premium_since: string | null;
    roles: string[];
    unusual_dm_activity_until: string | null;
    collectibles: any;
    user: {
        id: string;
        username: string;
        avatar: string | null;
        discriminator: string;
        public_flags: number;
        flags: number;
        bot?: boolean;
        banner: string | null;
        accent_color: string | null;
        global_name: string | null;
        avatar_decoration_data: any;
        collectibles: any;
        display_name_styles: any;
        banner_color: string | null;
        clan: string | null;
        primary_guild: string | null;
    },
    mute: boolean;
    deaf: boolean;

}