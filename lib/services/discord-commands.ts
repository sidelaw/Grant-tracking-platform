export const commands = [
  // Milestone Management Commands
  {
    name: "milestone",
    description: "Manage project milestones",
    type: 1, // CHAT_INPUT
    options: [
      {
        name: "complete",
        description: "Mark a milestone as completed",
        type: 1, // SUB_COMMAND
        options: [
          {
            name: "milestone",
            description: "Select or enter milestone name",
            type: 3, // STRING
            required: true,
            autocomplete: true, // Enable autocomplete for milestone names
          },
          {
            name: "notes",
            description: "Completion notes (optional)",
            type: 3, // STRING
            required: false,
          },
        ],
      },
      {
        name: "progress",
        description: "Update milestone progress",
        type: 1, // SUB_COMMAND
        options: [
          {
            name: "milestone",
            description: "Select or enter milestone name",
            type: 3, // STRING
            required: true,
            autocomplete: true,
          },
          {
            name: "percentage",
            description: "Progress percentage (0-100)",
            type: 4, // INTEGER
            required: true,
            min_value: 0,
            max_value: 100,
          },
          {
            name: "notes",
            description: "Progress notes (optional)",
            type: 3, // STRING
            required: false,
          },
        ],
      },
      {
        name: "create",
        description: "Create a new milestone",
        type: 1, // SUB_COMMAND
        options: [
          {
            name: "title",
            description: "Milestone title",
            type: 3, // STRING
            required: true,
            max_length: 100,
          },
          {
            name: "description",
            description: "Milestone description",
            type: 3, // STRING
            required: false,
            max_length: 500,
          },
          {
            name: "deadline",
            description: "Deadline (YYYY-MM-DD format)",
            type: 3, // STRING
            required: false,
          },
        ],
      },
      {
        name: "list",
        description: "List all project milestones",
        type: 1, // SUB_COMMAND
        options: [
          {
            name: "status",
            description: "Filter by status",
            type: 3, // STRING
            required: false,
            choices: [
              { name: "All", value: "all" },
              { name: "Pending", value: "pending" },
              { name: "Completed", value: "completed" },
              { name: "Delayed", value: "delayed" },
            ],
          },
        ],
      },
    ],
  },

  // Project Management Commands
  {
    name: "project",
    description: "Manage projects",
    type: 1, // CHAT_INPUT
    options: [
      {
        name: "status",
        description: "Get current project status and stats",
        type: 1, // SUB_COMMAND
        options: [],
      },
      {
        name: "create-project",
        description: "Create a new project with milestones in this channel",
        type: 1, // CHAT_INPUT
        options: [
          {
            name: "name",
            description: "Project name",
            type: 3, // STRING
            required: true,
            max_length: 100,
          },
          {
            name: "description",
            description: "Project description",
            type: 3, // STRING
            required: true,
            max_length: 1000,
          },
          {
            name: "budget",
            description: "Project budget",
            type: 4, // INTEGER
            required: true,
            min_value: 0,
          },
          {
            name: "duration",
            description: "Duration in days",
            type: 4, // INTEGER
            required: true,
            min_value: 1,
          },
          {
            name: "status",
            description: "Project status",
            type: 3, // STRING
            required: true,
            choices: [
              { name: "Active", value: "active" },
              { name: "Planning", value: "planning" },
              { name: "Review", value: "review" },
              { name: "Completed", value: "completed" },
              { name: "Delayed", value: "delayed" },
            ],
          },
          {
            name: "star_rating",
            description: "Project star rating (1-5)",
            type: 4, // INTEGER
            required: true,
            choices: [
              { name: "1 Star", value: 1 },
              { name: "2 Stars", value: 2 },
              { name: "3 Stars", value: 3 },
              { name: "4 Stars", value: 4 },
              { name: "5 Stars", value: 5 },
            ],
          },
          {
            name: "risk_status",
            description: "Risk assessment",
            type: 3, // STRING
            required: true,
            choices: [
              { name: "Low Risk", value: "low" },
              { name: "Medium Risk", value: "medium" },
              { name: "High Risk", value: "high" },
            ],
          },
          {
            name: "github_repo",
            description: "GitHub repository (format: owner/repo)",
            type: 3, // STRING
            required: true,
          },
          {
            name: "location",
            description: "Project location",
            type: 3, // STRING
            required: true,
          },
          {
            name: "grantee",
            description: "Grantee name",
            type: 3, // STRING
            required: true,
          },
          {
            name: "category",
            description: "Project category",
            type: 3, // STRING
            required: true,
          },
          {
            name: "start_date",
            description: "Start date (YYYY-MM-DD format)",
            type: 3, // STRING
            required: true,
          },
          {
            name: "wallet_address",
            description: "Wallet address",
            type: 3, // STRING
            required: true,
          },
          {
            name: "vp_amount",
            description: "VP amount",
            type: 3, // STRING
            required: true,
          },
        ],
      },
      {
        name: "link",
        description: "Link this channel to a project",
        type: 1, // SUB_COMMAND
        options: [
          {
            name: "project_id",
            description: "Project ID to link to this channel",
            type: 3, // STRING
            required: true,
          },
        ],
      },

      {
        name: "unlink",
        description: "Unlink this channel from current project",
        type: 1, // SUB_COMMAND
        options: [],
      },
    ],
  },

  // Activity and Stats Commands
  {
    name: "activity",
    description: "View project activity and statistics",
    type: 1, // CHAT_INPUT
    options: [
      {
        name: "recent",
        description: "Show recent project activity",
        type: 1, // SUB_COMMAND
        options: [
          {
            name: "limit",
            description: "Number of activities to show (default: 10)",
            type: 4, // INTEGER
            required: false,
            min_value: 1,
            max_value: 50,
          },
          {
            name: "source",
            description: "Filter by source",
            type: 3, // STRING
            required: false,
            choices: [
              { name: "All", value: "all" },
              { name: "GitHub", value: "github" },
              { name: "Discord", value: "discord" },
              { name: "Manual", value: "manual" },
            ],
          },
        ],
      },
      {
        name: "stats",
        description: "Show project statistics",
        type: 1, // SUB_COMMAND
        options: [
          {
            name: "period",
            description: "Time period for stats",
            type: 3, // STRING
            required: false,
            choices: [
              { name: "Last 7 days", value: "7d" },
              { name: "Last 30 days", value: "30d" },
              { name: "All time", value: "all" },
            ],
          },
        ],
      },
    ],
  },

  // Quick Update Command (simplified)
  {
    name: "update",
    description: "Quick milestone update",
    type: 1, // CHAT_INPUT
    options: [
      {
        name: "message",
        description: "Update message (will auto-detect milestone and progress)",
        type: 3, // STRING
        required: true,
        max_length: 2000,
      },
    ],
  },

  // Context Menu Commands
  {
    name: "Track Message",
    description: "", // Context menu commands don't show descriptions
    type: 3, // MESSAGE context menu
    // Appears when right-clicking on messages
  },

  {
    name: "Check User Activity",
    description: "", // Context menu commands don't show descriptions
    type: 2, // USER context menu
    // Appears when right-clicking on users
  },
];


