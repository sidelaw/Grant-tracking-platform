const { REST } = require('@discordjs/rest');
const { Routes} = require('discord-api-types/v10');
require('dotenv').config();

const commands = [
  // Milestone Management Commands
  {
    name: "milestone",
    description: "Manage program milestones",
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
    ],
  },

  // Project Management Commands
  {
    name: "program",
    description: "Manage Program Status",
    type: 1, // CHAT_INPUT
    options: [
      {
        name: "update-status",
        description: "Update the status of an existing program",
        type: 1, // CHAT_INPUT
        options: [
          {
            name: "status",
            description: "Program status",
            type: 3, // STRING
            required: true,
            choices: [
              { name: "Active", value: "active" },
              { name: "Paused", value: "paused" },
              { name: "Completed", value: "completed" },
              { name: "At Risk", value: "At risk" },
            ],
          },
          
        ],
      },
    ],
  },
];

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const GUILD_ID = process.env.DISCORD_GUILD_ID; 

async function registerCommands() {
    console.log(DISCORD_BOT_TOKEN, CLIENT_ID, GUILD_ID);
    try {
        if (!DISCORD_BOT_TOKEN) {
            console.error("DISCORD_BOT_TOKEN is not set.");
            return;
        }
        if (!CLIENT_ID) {
            console.error("DISCORD_CLIENT_ID is not set.");
            return;
        }

        const rest = new REST({ version: '10' }).setToken(DISCORD_BOT_TOKEN);
        console.log("Registering slash commands with Discord...");

        if (GUILD_ID) {
            // Register guild-specific commands (for testing)
            const data = await rest.put(
                Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
                { body: commands }
            );
            console.log(`✅ Registered commands for guild ${GUILD_ID}`, data);
        } else {
            // Register global commands
            const data = await rest.put(
                Routes.applicationCommands(CLIENT_ID),
                { body: commands }
            );
            console.log("✅ Registered global commands", data);
        }
    } catch (error) {
        console.error('Error registering commands:', error);
    }
}

if (require.main === module) {
    registerCommands().catch(console.error);
}

module.exports = { commands, registerCommands };