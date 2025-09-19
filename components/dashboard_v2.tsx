'use client';
import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Eye, Edit, Trash2, Calendar, DollarSign, Users, GitBranch } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Project, Milestone, Program, DiscordChannel, DiscordMember
 } from '../types';


export default function ProgramManagementV2() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [discordChannels, setDiscordChannels] = useState<DiscordChannel[]>([]);
  const [discordMembers, setDiscordMembers] = useState<DiscordMember[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [isCreatingChannel, setIsCreatingChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const guildId = process.env.NEXT_PUBLIC_DISCORD_GUILD_ID || '';
  const [stats, setStats] = useState<{
    programCount: number;
    activeProgramCount: number;
    delayedProgramCount: number;
    totalFundsSpent: number;
    totalBudget: number;
    totalAtRisk: number;
  } | null>(null);

  useEffect(() => {
    // Load Discord channels and members on component mount
    if (guildId) {
      fetchDiscordChannels();
      fetchDiscordMembers();
      fetchPrograms();
      fetchStats();
      fetchRecentActivity();
    }
  }, []);
  const fetchRecentActivity = async () => {
    try {
        const response = await fetch('/api/activities/recent');
        if(response.ok){
            const data = await response.json();
            setRecentActivity(data);
        }
    } catch (error) {
        console.error('Failed to fetch recent activity:', error);
    }
  }
 const fetchStats = async () => {
  try {
    const response = await fetch('/api/stats');
    if (response.ok) {
      const data = await response.json();
      setStats(data);
    }
  } catch (error) {
    console.error('Failed to fetch program stats:', error);
  }
 }
  const fetchDiscordChannels = async () => {
    if (!guildId) return;
    
    try {
      const response = await fetch(`/api/discord/${guildId}/channels`);
      if (response.ok) {
        const channels = await response.json();
        setDiscordChannels(channels);
      } 
    } catch (error) {
      console.error('Failed to fetch Discord channels:', error);
    }
  };

  const fetchDiscordMembers = async () => {
    if (!guildId) return;
    
    try {
      const response = await fetch(`/api/discord/${guildId}/members`);
      if (response.ok) {
        const members = await response.json();
        setDiscordMembers(members);
      } 
    } catch (error) {
      console.error('Failed to fetch Discord members:', error);
    }
  };

  const createDiscordChannel = async (channelName: string) => {
    if (!guildId || !channelName.trim()) return;
    
    setIsCreatingChannel(true);
    try {
      const response = await fetch(`/api/discord/${guildId}/channels`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: channelName.trim(),
          type: 0 // Text channel
        }),
      });
      
      if (response.ok) {
        const newChannel = await response.json();
        setDiscordChannels([...discordChannels, newChannel]);
        setNewChannelName('');
        return newChannel.id;
      }
    } catch (error) {
      console.error('Failed to create Discord channel:', error);
    } finally {
      setIsCreatingChannel(false);
    }
  };
  const fetchPrograms = async () => {
    try {
            const response = await fetch('/api/programs');
            if(!response.ok){
                console.error('Failed to fetch programs:', response.statusText);
                return;
            }
            const data = await response.json();
            setPrograms(data);
            return data;
    } catch (error) {
      console.error('Failed to fetch programs:', error);
      return;
    }
  }

  const fetchProgramChildren = async (programId: string, type: 'project_based' | 'milestone_based') => {
    try {
        const url = type === 'project_based' ? `/api/programs/${programId}/projects` : `/api/programs/${programId}/milestones`;
        const response = await fetch(url);
        if(!response.ok){
            console.error(`Failed to fetch ${type === 'project_based' ? 'projects' : 'milestones'}:`, response.statusText);
            return;
        }
         const data = await response.json();
        if (type === 'project_based') {
            setProjects((prev) => {
                const existingProjectIds = new Set(prev.map(p => p.id));
                
                return [ ...prev || [], ...data.filter((p:any) => !existingProjectIds.has(p.id))];
            });
        } else {
            setMilestones((prev) => {
                const existingMilestoneIds = new Set(prev.map(m => m.id));
                return [...prev || [], ...data.filter((m:any) => !existingMilestoneIds.has(m.id))];
            });
        }
        return data;
    } catch (error) {
        console.error('Failed to fetch program children:', error);
        return;
    }
  }


  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'bg-green-500';
      case 'completed': return 'bg-blue-500';
      case 'paused': return 'bg-yellow-500';
      case 'at risk': return 'bg-red-500';
      case 'delayed': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const ProgramForm = ({ program, onClose }: { program?: Program | null; onClose: () => void }) => {
    const [formData, setFormData] = useState({
      name: program?.name || '',
      description: program?.description || '',
      type: program?.type || 'project_based',
      grantee: program?.grantee || '',
      grantee_email: program?.grantee_email || '',
      category: program?.category || '',
      budget: program?.budget || 0,
      duration: program?.duration || 30,
      status: program?.status || 'active',
      github_repo: program?.github_repo || '',
      discord_channel_id: program?.discord_channel_id || '',
      owner_discord_id: program?.owner_discord_id || '',
      start_date: program?.start_date || '',
      url: program?.url || '',
      location: program?.location || ''
    });

    const [childItems, setChildItems] = useState<(Project | Milestone)[]>([]);

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      // Handle form submission
        const response = await fetch(program && program?.id ? `/api/programs/${program.id}` : '/api/programs', {
        method: program ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
        }),
      });
        if (!response.ok) {
            console.error('Failed to submit program:', response.statusText);
        };
      const new_program = await response.json();
    //   if project type is project_based and child items has values, create projects
        if (formData.type === 'project_based' && childItems.length > 0) {
            for (const item of childItems) {
                await fetch(`/api/programs/${new_program.id}/projects`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(item),
                });
            }
        } else if (formData.type === 'milestone_based' && childItems.length > 0) {
            for (const item of childItems) {
                await fetch(`/api/programs/${new_program.id}/milestones`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(item),
                });
            }
        }
      console.log('Submitting:', formData, childItems);
      onClose();
    };

    const addChildItem = () => {
      if (formData.type === 'project_based') {
        const newProject: Partial<Project> = {
          name: '',
          description: '',
          status: 'active',
          progress: 0
        };
        setChildItems([...childItems, newProject as Project]);
      } else {
        const newMilestone: Partial<Milestone> = {
          title: '',
          description: '',
          budget: 0,
          status: 'pending',
          progress: 0
        };
        setChildItems([...childItems, newMilestone as Milestone]);
      }
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <ScrollArea className="h-[60vh] pr-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label htmlFor="name">Program Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
              />
              <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({...formData, location: e.target.value})}
              />
            </div>
          </div>
            
            <div className="space-y-2">
              <Label htmlFor="type">Program Type *</Label>
              <Select value={formData.type} onValueChange={(value) => setFormData({...formData, type: value as 'project_based' | 'milestone_based'})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="project_based">Project Based</SelectItem>
                  <SelectItem value="milestone_based">Milestone Based</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="grantee">Grantee *</Label>
              <Input
                id="grantee"
                value={formData.grantee}
                onChange={(e) => setFormData({...formData, grantee: e.target.value})}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="grantee_email">Grantee Email *</Label>
              <Input
                id="grantee_email"
                type="email"
                value={formData.grantee_email}
                onChange={(e) => setFormData({...formData, grantee_email: e.target.value})}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="budget">Budget *</Label>
              <Input
                id="budget"
                type="number"
                min="0"
                value={formData.budget}
                onChange={(e) => setFormData({...formData, budget: Number(e.target.value)})}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duration (days) *</Label>
              <Input
                id="duration"
                type="number"
                min="1"
                value={formData.duration}
                onChange={(e) => setFormData({...formData, duration: Number(e.target.value)})}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value as Program['status']})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="At risk">At Risk</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="github_repo">GitHub Repository *</Label>
              <Input
                id="github_repo"
                placeholder="owner/repo"
                value={formData.github_repo}
                onChange={(e) => setFormData({...formData, github_repo: e.target.value})}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="url">URL *</Label>
              <Input
                id="url"
                type="url"
                value={formData.url}
                onChange={(e) => setFormData({...formData, url: e.target.value})}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date *</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="discord_channel_id">Discord Channel *</Label>
              <div className="space-y-2">
                <Select 
                  value={formData.discord_channel_id} 
                  onValueChange={(value) => setFormData({...formData, discord_channel_id: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a Discord channel" />
                  </SelectTrigger>
                  <SelectContent>
                    {discordChannels.map((channel) => (
                      <SelectItem key={channel.id} value={channel.id}>
                        #{channel.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {/* <div className="flex gap-2">
                  <Input
                    placeholder="New channel name"
                    value={newChannelName}
                    onChange={(e) => setNewChannelName(e.target.value)}
                    className=""
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!newChannelName.trim() || isCreatingChannel}
                    onClick={async () => {
                      const newChannelId = await createDiscordChannel(newChannelName);
                      if (newChannelId) {
                        setFormData({...formData, discord_channel_id: newChannelId});
                      }
                    }}
                  >
                    {isCreatingChannel ? 'Creating...' : 'Create'}
                  </Button>
                </div> */}
                <p className="text-xs text-gray-500">
                  Select an existing channel or create a new one
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="owner_discord_id">Discord Owner *</Label>
              <Select 
                value={formData.owner_discord_id} 
                onValueChange={(value) => setFormData({...formData, owner_discord_id: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Discord member" />
                </SelectTrigger>
                <SelectContent>
                  {discordMembers.map((member) => (
                    <SelectItem key={member.user.id} value={member.user.id}>
                      <div className="flex items-center gap-2">
                        {member.user.avatar && (
                          <img 
                            src={`https://cdn.discordapp.com/avatars/${member.user.id}/${member.user.avatar}.png`}
                            alt={member.user.username}
                            className="w-4 h-4 rounded-full"
                          />
                        )}
                        <span>{member.user.username}</span>
                        <span className="text-gray-500 text-xs">@{member.user.username}</span>
                      </div>    
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
            />
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {formData.type === 'project_based' ? 'Projects' : 'Milestones'}
              </h3>
              <Button type="button" variant="outline" size="sm" onClick={addChildItem}>
                <Plus className="w-4 h-4 mr-2" />
                Add {formData.type === 'project_based' ? 'Project' : 'Milestone'}
              </Button>
            </div>

            {childItems.map((item, index) => (
              <Card key={index} className="mb-4">
                <CardContent className="pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>
                        {formData.type === 'project_based' ? 'Project Name' : 'Milestone Title'} *
                      </Label>
                      <Input
                        value={formData.type === 'project_based' ? (item as Project).name : (item as Milestone).title}
                        onChange={(e) => {
                          const updated = [...childItems];
                          if (formData.type === 'project_based') {
                            (updated[index] as Project).name = e.target.value;
                          } else {
                            (updated[index] as Milestone).title = e.target.value;
                          }
                          setChildItems(updated);
                        }}
                        required
                      />
                    </div>
                    
                    {formData.type === 'milestone_based' && (
                      <div className="space-y-2">
                        <Label>Budget *</Label>
                        <Input
                          type="number"
                          min="0"
                          value={(item as Milestone).budget}
                          onChange={(e) => {
                            const updated = [...childItems];
                            (updated[index] as Milestone).budget = Number(e.target.value);
                            setChildItems(updated);
                          }}
                          required
                        />
                      </div>
                    )}

                    {formData && formData.type === 'milestone_based' && (
                      <div className="space-y-2">
                        <Label>Due Date</Label>
                        <Input
                          type="date"
                          value={(item as Milestone).due_date || ''}
                          onChange={(e) => {
                            const updated = [...childItems];
                            (updated[index] as Milestone).due_date = e.target.value;
                            setChildItems(updated);
                          }}
                        />
                      </div>
                    )}
                  </div>

                  <div className="mt-4 space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      rows={2}
                      value={item.description || ''}
                      onChange={(e) => {
                        const updated = [...childItems];
                        updated[index].description = e.target.value;
                        setChildItems(updated);
                      }}
                    />
                  </div>

                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="mt-2"
                    onClick={() => {
                      const updated = childItems.filter((_, i) => i !== index);
                      setChildItems(updated);
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-2"/>
                    Remove
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">
            {program ? 'Update Program' : 'Create Program'}
          </Button>
        </DialogFooter>
      </form>
    );
  };
    const [projects, setProjects] = useState<Project[]>([]);
    const [milestones, setMilestones] = useState<Milestone[]>([]);

  const ProgramDetails = ({ program }: { program: Program }) => {
    const programProjects = projects.filter(p => p.program_id === program.id);
    const programMilestones = milestones.filter(m => m.program_id === program.id);
    const programChannel = discordChannels.find(c => c.id === program.discord_channel_id);
    const programOwner = discordMembers.find(m => m.user.id === program.owner_discord_id);
  
    React.useEffect(()=>{
         const fetchProgramChildren = async ( ) => {
    try {
        const url = program.type === 'project_based' ? `/api/programs/${program.id}/projects` : `/api/programs/${program.id}/milestones`;
        const response = await fetch(url);
        if(!response.ok){
            console.error(`Failed to fetch ${program.type === 'project_based' ? 'projects' : 'milestones'}:`, response.statusText);
            return;
        }
         const data = await response.json();
        if (program.type === 'project_based') {
            setProjects((prev) => {
                const existingProjectIds = new Set(prev.map(p => p.id));
                
                return [ ...prev || [], ...data.filter((p:any) => !existingProjectIds.has(p.id))];
            });
        } else {
            setMilestones((prev) => {
                const existingMilestoneIds = new Set(prev.map(m => m.id));
                return [...prev || [], ...data.filter((m:any) => !existingMilestoneIds.has(m.id))];
            });
        }
        return data;
    } catch (error) {
        console.error('Failed to fetch program children:', error);
        return;
    }
  }
  fetchProgramChildren();
    },[]);
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-semibold text-sm text-gray-500 mb-1">Program Type</h4>
            <Badge variant="outline" className="capitalize">
              {program.type.replace('_', ' ')}
            </Badge>
          </div>
          <div>
            <h4 className="font-semibold text-sm text-gray-500 mb-1">Status</h4>
            <Badge className={getStatusColor(program.status)}>
              {program.status}
            </Badge>
          </div>
          <div>
            <h4 className="font-semibold text-sm text-gray-500 mb-1">Progress</h4>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full" 
                  style={{ width: `${program.progress}%` }}
                ></div>
              </div>
              <span className="text-sm font-medium">{program.progress}%</span>
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-sm text-gray-500 mb-1">Budget</h4>
            <p className="font-medium">${program.budget.toLocaleString()}</p>
            {program.funds_spent && (
              <p className="text-sm text-gray-500">
                Spent: ${program.funds_spent.toLocaleString()}
              </p>
            )}
          </div>
          <div>
            <h4 className="font-semibold text-sm text-gray-500 mb-1">Grantee</h4>
            <p className="font-medium">{program.grantee}</p>
            <p className="text-sm text-gray-500">{program.grantee_email}</p>
          </div>
          <div>
            <h4 className="font-semibold text-sm text-gray-500 mb-1">Category</h4>
            <p className="font-medium">{program.category}</p>
          </div>
          <div>
            <h4 className="font-semibold text-sm text-gray-500 mb-1">Discord Channel</h4>
            <p className="font-medium">#{programChannel?.name || 'Unknown'}</p>
            <p className="text-xs text-gray-500">ID: {program.discord_channel_id}</p>
          </div>
          <div>
            <h4 className="font-semibold text-sm text-gray-500 mb-1">Discord Owner</h4>
            <div className="flex items-center gap-2">
              {programOwner?.user.avatar && (
                <img 
                  src={`https://cdn.discordapp.com/avatars/${programOwner?.user.id}/${programOwner?.user.avatar}.png`}
                  alt={programOwner.user.username}
                  className="w-5 h-5 rounded-full"
                />
              )}
              <div>
                <p className="font-medium text-sm">{programOwner?.user.username}</p>
                {programOwner && (
                  <p className="text-xs text-gray-500">@{programOwner?.user.username}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {program.description && (
          <div>
            <h4 className="font-semibold text-sm text-gray-500 mb-2">Description</h4>
            <p className="text-sm">{program.description}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-gray-500" />
            <a 
              href={`https://github.com/${program.github_repo}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline text-sm"
            >
              {program.github_repo}
            </a>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <span className="text-sm">Duration: {program.duration} days</span>
          </div>
          {program.location && (
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-500" />
              <span className="text-sm">{program.location}</span>
            </div>
          )}
        </div>

        {program.type === 'project_based' && programProjects.length > 0 && (
          <div>
            <h4 className="font-semibold mb-3">Projects</h4>
            <div className="space-y-2">
              {programProjects.map((project) => (
                <Card key={project.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-medium">{project.name}</h5>
                      <Badge className={getStatusColor(project.status)} variant="outline">
                        {project.status}
                      </Badge>
                    </div>
                    {project.description && (
                      <p className="text-sm text-gray-600 mb-2">{project.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>Progress: {project.progress}%</span>
                      {project.budget && <span>Budget: ${project.budget.toLocaleString()}</span>}
                      {project.funds_spent && <span>Spent: ${project.funds_spent.toLocaleString()}</span>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {program.type === 'milestone_based' && programMilestones.length > 0 && (
          <div>
            <h4 className="font-semibold mb-3">Milestones</h4>
            <div className="space-y-2">
              {programMilestones.map((milestone) => (
                <Card key={milestone.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-medium">{milestone.title}</h5>
                      <Badge className={getStatusColor(milestone.status)} variant="outline">
                        {milestone.status}
                      </Badge>
                    </div>
                    {milestone.description && (
                      <p className="text-sm text-gray-600 mb-2">{milestone.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>Progress: {milestone.progress}%</span>
                      <span>Budget: ${milestone.budget.toLocaleString()}</span>
                      {milestone.funds_spent && <span>Spent: ${milestone.funds_spent.toLocaleString()}</span>}
                      {milestone.due_date && <span>Due: {new Date(milestone.due_date).toLocaleDateString()}</span>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Program Management</h1>
          <p className="text-gray-600">Manage your grant programs, projects, and milestones</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Create Program
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Create New Program</DialogTitle>
            </DialogHeader>
            <ProgramForm onClose={() => setIsCreateDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Programs Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden sm:table-cell">Type</TableHead>
                  <TableHead className="hidden md:table-cell">Grantee</TableHead>
                  <TableHead className="hidden lg:table-cell">Budget</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden sm:table-cell">Progress</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {programs.map((program) => (
                  <TableRow key={program.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{program.name}</div>
                        <div className="text-sm text-gray-500 sm:hidden">
                          {program.type.replace('_', ' ')} • {program.grantee}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant="outline" className="capitalize">
                        {program.type.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div>
                        <div className="font-medium">{program.grantee}</div>
                        <div className="text-sm text-gray-500">{program.category}</div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="font-medium">${program.budget.toLocaleString()}</div>
                      {program.funds_spent && (
                        <div className="text-sm text-gray-500">
                          Spent: ${program.funds_spent.toLocaleString()}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(program.status)}>
                        {program.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 min-w-16">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${program.progress}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium min-w-10 text-right">{program.progress}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Dialog open={isDetailDialogOpen && selectedProgram?.id === program.id} 
                               onOpenChange={(open) => {
                                 if (!open) {
                                   setIsDetailDialogOpen(false);
                                   setSelectedProgram(null);
                                 }
                               }}>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setSelectedProgram(program);
                                setIsDetailDialogOpen(true);
                              }}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl">
                            <DialogHeader>
                              <DialogTitle>{program.name}</DialogTitle>
                            </DialogHeader>
                            {selectedProgram && <ProgramDetails program={selectedProgram} />}
                          </DialogContent>
                        </Dialog>

                        <Dialog open={isEditDialogOpen && editingProgram?.id === program.id} 
                               onOpenChange={(open) => {
                                 if (!open) {
                                   setIsEditDialogOpen(false);
                                   setEditingProgram(null);
                                 }
                               }}>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setEditingProgram(program);
                                setIsEditDialogOpen(true);
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl">
                            <DialogHeader>
                              <DialogTitle>Edit Program</DialogTitle>
                            </DialogHeader>
                            <ProgramForm 
                              program={editingProgram} 
                              onClose={() => {
                                setIsEditDialogOpen(false);
                                setEditingProgram(null);
                              }} 
                            />
                          </DialogContent>
                        </Dialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Programs</p>
                <p className="text-2xl font-bold">{stats?.programCount}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Programs</p>
                <p className="text-2xl font-bold">
                  {
                    stats?.activeProgramCount
                  }
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <Users className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Budget</p>
                <p className="text-2xl font-bold">
                  ${stats?.totalBudget.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <DollarSign className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Funds Spent</p>
                <p className="text-2xl font-bold">
                  ${stats?.totalFundsSpent.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <GitBranch className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity / Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {
                recentActivity?.map((activity, index) => (
                  <div key={index} className="flex items-center gap-3 pb-3 border-b last:border-0">
                    <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{activity?.parent_title}</p>
                      {activity?.title && (
                        <p className="text-xs text-gray-500">{activity?.title}</p>
                      )}
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(activity?.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              }
              <div className="flex items-center gap-3 pb-3 border-b">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">DeFi Protocol Development updated</p>
                  <p className="text-xs text-gray-500">Progress increased to 65%</p>
                </div>
                <span className="text-xs text-gray-400">2h ago</span>
              </div>
              <div className="flex items-center gap-3 pb-3 border-b">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">New milestone completed</p>
                  <p className="text-xs text-gray-500">UI/UX Design for NFT Marketplace</p>
                </div>
                <span className="text-xs text-gray-400">1d ago</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Budget allocation updated</p>
                  <p className="text-xs text-gray-500">Smart Contract Implementation</p>
                </div>
                <span className="text-xs text-gray-400">3d ago</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-start">
                <Plus className="w-4 h-4 mr-2" />
                Add New Milestone
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Edit className="w-4 h-4 mr-2" />
                Update Program Status
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Calendar className="w-4 h-4 mr-2" />
                Schedule Review
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <DollarSign className="w-4 h-4 mr-2" />
                Record Expenses
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}