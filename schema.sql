-- Enable UUID extension (run this first if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum types
CREATE TYPE program_type AS ENUM (
  'project_based',
  'milestone_based'
);

CREATE TYPE status_type AS ENUM (
  'active',
  'planning',
  'review',
  'completed',
  'delayed',
  'paused'
);
CREATE TYPE program_status_type AS ENUM (
  'At risk',
  'active', 
  'paused',
  'completed'
);


CREATE TYPE milestone_status AS ENUM (
  'pending',
  'completed',
  'delayed'
);

CREATE TYPE activity_source AS ENUM (
  'github',
  'discord',
  'telegram',
  'twitter',
  'manual'
);

CREATE TYPE log_type AS ENUM (
  'commit',
  'pull_request',
  'issue',
  'announcement',
  'milestone_update',
  'milestone_completed',
  'milestone_progress',
  'project_update',
  'general'
);

-- Programs table (top level)
CREATE TABLE programs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    type program_type NOT NULL, -- Either 'project_based' or 'milestone_based'
    grantee TEXT NOT NULL,
    grantee_email TEXT NOT NULL,
    category TEXT NOT NULL,
    budget INTEGER NOT NULL,
    duration INTEGER NOT NULL, -- Duration in days
    status program_status_type DEFAULT 'active',
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    github_repo VARCHAR(255) NOT NULL, -- GitHub repository (owner/repo)
    funds_spent INTEGER,
    discord_channel_id VARCHAR(255) NOT NULL, -- Discord channel ID for tracking
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    owner_discord_id VARCHAR(255) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_update DATE,
    next_update DATE,
    avatar_src TEXT,
    avatar_bg TEXT,
    wallet_address TEXT,
    location TEXT,
    star_rating INTEGER,
    vp_amount TEXT,
    start_date DATE NOT NULL,
    url TEXT NOT NULL
);

-- Projects table (only exists for project_based programs)
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    program_id UUID NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    budget INTEGER,
    status status_type DEFAULT 'active',
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    github_repo VARCHAR(255),
    funds_spent INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    start_date DATE,
    end_date DATE,
    url TEXT,
    FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE
);

-- Milestones table (only belongs to milestone_based programs)
CREATE TABLE milestones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    program_id UUID NOT NULL, -- Only for milestone_based programs
    title TEXT NOT NULL,
    description TEXT,
    budget  INT,
    funds_spent INT NULL,
    due_date DATE,
    status milestone_status DEFAULT 'pending',
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    completion_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE
);

-- Activity logs table - unified logging for all activities
CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    program_id UUID NOT NULL,
    project_id UUID, -- Only for project_based programs
    milestone_id UUID, -- Only for milestone_based programs
    source activity_source NOT NULL,
    type log_type NOT NULL,
    content JSONB,
    url TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_github VARCHAR(255),
    user_discord VARCHAR(255),
    FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (milestone_id) REFERENCES milestones(id) ON DELETE SET NULL,
    -- Ensure activity can reference project OR milestone, but not both
    CONSTRAINT check_activity_child 
        CHECK ((project_id IS NOT NULL AND milestone_id IS NULL) OR 
               (project_id IS NULL AND milestone_id IS NOT NULL) OR
               (project_id IS NULL AND milestone_id IS NULL))
);

-- Reviews table
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    program_id UUID NOT NULL,
    reviewer VARCHAR(255) NOT NULL,
    review_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE
);

-- Payouts table
CREATE TABLE payouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    program_id UUID NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    released_at TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE
);

-- Create indexes for programs table
CREATE INDEX idx_programs_type ON programs(type);
CREATE INDEX idx_programs_status ON programs(status);
CREATE INDEX idx_programs_github_repo ON programs(github_repo);
CREATE INDEX idx_programs_discord_channel ON programs(discord_channel_id);
CREATE INDEX idx_programs_owner_discord ON programs(owner_discord_id);

-- Create indexes for projects table
CREATE INDEX idx_projects_program_id ON projects(program_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_github_repo ON projects(github_repo);

-- Create indexes for milestones table
CREATE INDEX idx_milestones_program_id ON milestones(program_id);
CREATE INDEX idx_milestones_status ON milestones(status);
CREATE INDEX idx_milestones_due_date ON milestones(due_date);

-- Create indexes for activity_logs table
CREATE INDEX idx_activity_logs_program_id ON activity_logs(program_id);
CREATE INDEX idx_activity_logs_project_id ON activity_logs(project_id);
CREATE INDEX idx_activity_logs_milestone_id ON activity_logs(milestone_id);
CREATE INDEX idx_activity_logs_source_type ON activity_logs(source, type);
CREATE INDEX idx_activity_logs_timestamp ON activity_logs(timestamp);
CREATE INDEX idx_activity_logs_user_github ON activity_logs(user_github);
CREATE INDEX idx_activity_logs_user_discord ON activity_logs(user_discord);

-- Create indexes for reviews table
CREATE INDEX idx_reviews_program_id ON reviews(program_id);
CREATE INDEX idx_reviews_reviewer ON reviews(reviewer);

-- Create indexes for payouts table
CREATE INDEX idx_payouts_program_id ON payouts(program_id);
CREATE INDEX idx_payouts_released ON payouts(released_at);
