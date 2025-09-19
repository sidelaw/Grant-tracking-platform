import { createBrowserClient} from '@supabase/ssr';
import { ActivityLog, 
    Milestone,
    Project,
    Program
 } from '@/types';
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
};

const supabase = createClient();

class SupabaseDatabase {
  async getTotalProgramsCount(){
    try {
      const { data, error } = await supabase
        .from('programs')
        .select('id', { count: 'exact' })
      if (error) throw error;
      return data?.length || 0;
    } catch (error) {
      console.error('Error fetching total programs:', error);
      throw error;
    }
  }
  async getTotalFundsSpent(){
    try {
        const { data, error } = await supabase
        .from('programs')
        .select('funds_spent');
      if (error) throw error;
      return data?.reduce((total, program) => total + (program.funds_spent || 0), 0) || 0;
    } catch (error) {
      console.error('Error fetching total funds spent:', error);
      throw error;
    }
  }
  async getTotalBudget(){
    try {
      const { data, error } = await supabase
        .from('programs')
        .select('budget');
      if (error) throw error;
      return data?.reduce((total, program) => total + (program.budget || 0), 0) || 0;
    } catch (error) {
      console.error('Error fetching total budget:', error);
      throw error;
    }
  }
  async getTotalActiveProgramsCount(){
    try {
      const { data, error } = await supabase
        .from('programs')
        .select('id', { count: 'exact' })
        .eq('status', 'active');
      if (error) throw error;
      return data?.length || 0;
    } catch (error) {
      console.error('Error fetching total active programs:', error);
      throw error;
      
    }
  }

  async getDelayedProgramsCount(){
    // program start_date + duration to get end date and compare with current date
    try {
      const { data, error } = await supabase
        .from('programs')
        .select('id, name, start_date, duration, status')
      if (error) throw error;
      const now = new Date();
      return data?.filter(project => {
        if (project.start_date && project.duration) {
          const startDate = new Date(project.start_date);
          const endDate = new Date(startDate);
          endDate.setDate(startDate.getDate() + project.duration);
          return endDate < now;
        }
        return false;
      }) || [];
    } catch (error) {
      console.error('Error fetching delayed programs:', error);
      throw error;
    }
  };
  async getAtRiskProgramsCount(){
    // programs that are not updated in the last 30 days
    try {
      const { data, error } = await supabase
        .from('programs')
        .select('id, name, updated_at, status')
      if (error) throw error;
      const now = new Date();
      return data?.filter(project => {
        if (project.updated_at) {
          const updatedAt = new Date(project.updated_at);
          const diffDays = Math.floor((now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24));
          return diffDays > 30;
        }
        return false;
      }) || [];
    } catch (error) {
      console.error('Error fetching at-risk programs:', error);
      throw error;
    }
  }
  async createActivityLog(data: ActivityLog): Promise<void> {
    try {
      const activityData = { ...data, timestamp: new Date().toISOString(), created_at: new Date().toISOString() };
      const { error } = await supabase
        .from('activity_logs')
        .insert([activityData]);

      if (error) throw error;
    } catch (error) {
      console.error('Error creating activity log:', error);
      throw error;
    }
  }

  async  getProgramActivities(
    programId: string, 
    options: {
      source?: 'github' | 'discord' | 'manual';
      type?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<ActivityLog[]> {
    const { source, type, limit = 50, offset = 0 } = options;
    
    try {
      let query = supabase
        .from('activity_logs')
        .select('*')
        .eq('program_id', programId);

      if (source) {
        query = query.eq('source', source);
      }

      if (type) {
        query = query.eq('type', type);
      }

      const { data, error } = await query
        .order('timestamp', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching program activities:', error);
      throw error;
    }
  }

  async getActivityStats(programId: string): Promise<any> {
    try {
      // Get daily stats for last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: dailyData, error: dailyError } = await supabase
        .from('activity_logs')
        .select('source, type, timestamp')
        .eq('program_id', programId)

      if (dailyError) throw dailyError;

      // Process daily stats
      const dailyStats = this.processActivityStats(dailyData || []);

      // Get total stats
      const { data: totalData, error: totalError } = await supabase
        .from('activity_logs')
        .select('source, user_github, user_discord')
        .eq('program_id', programId);

      if (totalError) throw totalError;

      const totalStats = this.processTotalStats(totalData || []);

      return {
        dailyStats,
        totalStats
      };
    } catch (error) {
      console.error('Error fetching activity stats:', error);
      throw error;
    }
  }
  async getMostRecentActivities(){
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(10);
        
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching most recent activities:', error);
      throw error;
    }
  }
  

    async mergeActivitiesToMilestones(): Promise<any[]> {
      try {
          const { data: activities, error: activitiesError } = await supabase
            .from('activity_logs')
            .select('*')
            .order('timestamp', { ascending: false });
          if (activitiesError) throw activitiesError;
          const mergedActivities = await Promise.all(activities.map(async (activity) => {
            if (activity.milestone_id) {
               const { data: milestone, error: milestoneError } = await supabase
                .from('milestones')
                .select('title')
                .eq('id', activity.milestone_id)
                .single();
                 if (milestoneError) throw milestoneError;
                return {
                  ...activity,
                  parent_title: milestone?.title || null,
                  title:  this.extractActivityContentMessage(activity.source, activity.content)
                }
            }
               
          }));
          return mergedActivities;
         
      } catch (error) {
        console.error('Error merging activities to milestones:', error);
        throw error;
      }
    }
 extractActivityContentMessage(activityType: 'manual' | 'github' | 'discord', content: any): string {
    if (activityType === 'manual') {
      return typeof content === 'string' ? content : '';
    }
    else if (activityType === 'github') {
      return content.message || '';
    }
    else if (activityType === 'discord') {
      return content.content || '';
    }
    return '';
  }
  async searchPrograms(queryStr: string): Promise<Program[]> {
    try {
      const { data, error } = await supabase

        .from('programs')
        .select('*')
        .ilike('name', `%${queryStr}%`)
        .ilike('grantee', `%${queryStr}%`)
        .ilike('category', `%${queryStr}%`)
        .or(`ilike(description, '%${queryStr}%'), ilike(github_repo, '%${queryStr}%')`)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching programs:', error);
      throw error;
    }
  }
  async getMostRecentProgramActivities(programId: string, limit = 10, source?: string){
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('program_id', programId)
        .order('timestamp', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching most recent program activities:', error);
      throw error;
    }

  }
  private processActivityStats(data: any[]): any[] {
    const statsMap = new Map();
    
    data.forEach(item => {
      const date = new Date(item.timestamp).toDateString();
      const key = `${item.source}-${item.type}-${date}`;
      
      if (!statsMap.has(key)) {
        statsMap.set(key, {
          source: item.source,
          type: item.type,
          date,
          count: 0
        });
      }
      statsMap.get(key).count++;
    });

    return Array.from(statsMap.values()).sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }

  private processTotalStats(data: any[]): any[] {
    const statsMap = new Map();
    
    data.forEach(item => {
      if (!statsMap.has(item.source)) {
        statsMap.set(item.source, {
          source: item.source,
          total: 0,
          unique_github_users: new Set(),
          unique_discord_users: new Set()
        });
      }
      
      const stats = statsMap.get(item.source);
      stats.total++;
      
      if (item.user_github) {
        stats.unique_github_users.add(item.user_github);
      }
      if (item.user_discord) {
        stats.unique_discord_users.add(item.user_discord);
      }
    });

    return Array.from(statsMap.values()).map(stats => ({
      source: stats.source,
      total: stats.total,
      unique_github_users: stats.unique_github_users.size,
      unique_discord_users: stats.unique_discord_users.size
    }));
  }

  async getProgramByChannelId(channelId: string): Promise<Program | undefined> {
    try {
      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .eq('discord_channel_id', channelId)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "not found"
      return data;
    } catch (error) {
      console.error('Error getting program by channel ID:', error);
      throw error;
    }
  }

  async messageExists(programId: string, messageId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('id')
        .eq('program_id', programId)
        .eq('source', 'discord')
        .contains('content', { message_id: messageId });

      if (error) throw error;
      return (data?.length || 0) > 0;
    } catch (error) {
      console.error('Error checking message existence:', error);
      return false;
    }
  }

  async commitExists(programId: string, sha: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('id')
        .eq('program_id', programId)
        .eq('source', 'github')
        .eq('type', 'commit')
        .contains('content', { sha });

      if (error) throw error;
      return (data?.length || 0) > 0;
    } catch (error) {
      console.error('Error checking commit existence:', error);
      return false;
    }
  }

  async prExists(programId: string, number: number, repository: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('id')
        .eq('program_id', programId)
        .eq('source', 'github')
        .eq('type', 'pull_request')
        .contains('content', { number, repository });

      if (error) throw error;
      return (data?.length || 0) > 0;
    } catch (error) {
      console.error('Error checking PR existence:', error);
      return false;
    }
  }

  async issueExists(programId: string, number: number, repository: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('id')
        .eq('program_id', programId)
        .eq('source', 'github')
        .eq('type', 'issue')
        .contains('content', { number, repository });

      if (error) throw error;
      return (data?.length || 0) > 0;
    } catch (error) {
      console.error('Error checking issue existence:', error);
      return false;
    }
  }

  async createProgram(program_data: Omit<Program, 'id' | 'created_at' | 'url'>): Promise<Project> {
    try {
      const program = {...program_data, url: program_data.name.toLowerCase().replace(/\s+/g, '-'), last_update: new Date(), updated_at: new Date()};
      const { data: project, error } = await supabase
        .from('programs')
        .insert([program])
        .select()
        .single();

      if (error) throw error;
      return project;
    } catch (error) {
      console.error('Error creating project:', error);
      throw error;
    }
  }

  async createProject(project_data: Omit<Project, 'id' | 'created_at' | 'updated_at'>): Promise<Project> {
    try {
      const project = {...project_data, created_at: new Date(), updated_at: new Date()};
      const { data: projectResult, error } = await supabase
        .from('projects')
        .insert([project])
        .select()
        .single();

      if (error) throw error;
      return projectResult;
    } catch (error) {
      console.error('Error creating project:', error);
      throw error;
    }
  }
  async getProgramByURL(url: string): Promise<Program | null> {
    try {
      const { data: program, error } = await supabase
        .from('programs')
        .select('*')
        .eq('url', url)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "not found"
      return program || null;
    } catch (error) {
      console.error('Error getting program by URL:', error);
      return null;
    }
  }
  async updateProgram(id: string, data: Partial<Program>): Promise<Program> {
    try {

      const updateData = { ...data, updated_at: new Date() };
      delete updateData.id;
      delete updateData.created_at;

      const { data: program, error } = await supabase
        .from('programs')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return program;
    } catch (error) {
      console.error('Error updating program:', error);
      throw error;
    }
  }
  async updateProject(id: string, data: Partial<Project>): Promise<Project> {
    try {
      // Remove id and created_at from update data
      const updateData = { ...data, updated_at: new Date() };
      delete updateData.id;
      delete updateData.created_at;

      const { data: project, error } = await supabase
        .from('projects')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return project;
    } catch (error) {
      console.error('Error updating project:', error);
      throw error;
    }
  }

  async getProject(id: string): Promise<Project | null> {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data || null;
    } catch (error) {
      console.error('Error getting project:', error);
      return null;
    }
  }
  async getProgram(id: string): Promise<Program | null> {
    try {
      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .eq('id', id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data || null;
    } catch (error) {
      console.error('Error getting program:', error);
      return null;
    }
  }

  async getProgramByRepository(repository: string): Promise<Program | null> {
    try {
        const { data, error } = await supabase
          .from('programs')
          .select('*')
          .eq('github_repo', repository)
          .single();

        if (error) throw error;
        return data || null;
    } catch (error) {
      console.error('Error getting program by repository:', error);
      return null;
    }
  }
  async getProjectByRepository(repository: string): Promise<Project | null> {
    try {
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .eq('github_repo', repository)
          .single();

        if (error) throw error;
        return data || null;
    } catch (error) {
      console.error('Error getting project by repository:', error);
      return null;
    }
  }
async getAllProjects(program_id:string): Promise<Project[]> {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('program_id', program_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      console.log('Fetched projects:', data);
      return data || [];
    } catch (error) {
      console.error('Error getting all projects:', error);
      throw error;
    }
  }
  async getAllPrograms(): Promise<Project[]> {
    try {
      const { data, error } = await supabase
        .from('programs')
        .select('*')
        // we need to include either milestones or projects based on type
        .order('created_at', { ascending: false });

      if (error) throw error;
      console.log('Fetched programs:', data);
      return data || [];
    } catch (error) {
      console.error('Error getting all programs:', error);
      throw error;
    }
  }

  async createMilestone(data: Omit<Milestone, 'id' | 'created_at' | 'updated_at'>): Promise<Milestone> {
    try {
      const { data: milestone, error } = await supabase
        .from('milestones')
        .insert([{
          program_id: data.program_id,
          title: data.title,
          description: data.description || '',
          budget: data.budget,
          funds_spent: data.funds_spent || 0,
          due_date: data.due_date,
          status: data.status || 'pending',
          progress: data.progress || 0
        }])
        .select()
        .single();

      if (error) throw error;
      return milestone;
    } catch (error) {
      console.error('Error creating milestone:', error);
      throw error;
    }
  }
  
  async updateMilestone(id: string, data: Partial<Milestone>): Promise<Milestone> {
    try {
      // Remove id and created_at from update data
      const updateData = { ...data, updated_at: new Date() };
      delete updateData.id;
      delete updateData.created_at;

      const { data: milestone, error } = await supabase
        .from('milestones')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return milestone;
    } catch (error) {
      console.error('Error updating milestone:', error);
      throw error;
    }
  }

  async getProgramMilestones(programId: string): Promise<Milestone[]> {
    try {
      const { data, error } = await supabase
        .from('milestones')
        .select('*')
        .eq('program_id', programId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting program milestones:', error);
      throw error;
    }
  }

  async updateProgramProgress(programId: string): Promise<void> {
    try {
      const isMilestoneBased = await this.isMilestoneBasedProgram(programId);
      if (isMilestoneBased) {
      // Get all milestones for the program
      const { data: milestones, error: milestonesError } = await supabase
        .from('milestones')
        .select('progress')
        .eq('program_id', programId);

      if (milestonesError) throw milestonesError;

      if (!milestones || milestones.length === 0) return;
      const milestoneProgress = this.milestoneProgramProgress(milestones);

      // Update program progress
      const { error: updateError } = await supabase
        .from('programs')
        .update({ progress: milestoneProgress.average_progress })
        .eq('id', programId);

      if (updateError) throw updateError;
      return;
      }

      // Get all projects for the program
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('id')
        .eq('program_id', programId)

      if (projectsError) throw projectsError;
      if (!projects) return;
      const projectsProgress = this.projectProgramProgress(projects);

      // Update project progress
      const { error: updateError } = await supabase
        .from('programs')
        .update({ progress: projectsProgress.average_progress })
        .eq('id', programId);

      if (updateError) throw updateError;
    } catch (error) {
      console.error('Error updating project progress:', error);
      throw error;
    }
  }

  async getProgramStats(programId: string): Promise<any> {
    try {
      // Get activity stats
      const { data: activities, error: activitiesError } = await supabase
        .from('activity_logs')
        .select('source, user_github, user_discord, type, timestamp')
        .eq('program_id', programId);

      if (activitiesError) throw activitiesError;

      // Process activity stats
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      const activityStats = this.processActivityStatsForProgram(activities || []);

      // Get recent activity (last 10)
      const recentActivity = activities.slice(0, 10);

      // we have to check if it's a project_based or milestone_based program
      const isMilestoneBased = await this.isMilestoneBasedProgram(programId);

      const progressUpdate ={
        total: 0, completed: 0, average_progress: 0
      }
      // Get milestone progress
      if(isMilestoneBased){
           const { data: milestones, error: milestonesError } = await supabase
        .from('milestones')
        .select('status, progress')
        .eq('program_id', programId);

      if (milestonesError) throw milestonesError;
        const milestoneProgress = this.milestoneProgramProgress(milestones || []);
        progressUpdate.total = milestoneProgress.total;
        progressUpdate.completed = milestoneProgress.completed;
        progressUpdate.average_progress = milestoneProgress.average_progress;
      } else {
          const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('status, progress')
        .eq('program_id', programId);

      if (projectsError) throw projectsError;
        const projectProgress = this.projectProgramProgress(projects || []);
        progressUpdate.total = projectProgress.total;
        progressUpdate.completed = projectProgress.completed;
        progressUpdate.average_progress = projectProgress.average_progress;
      }
      return {
        activityStats,
        recentActivity: recentActivity || [],
        progressUpdate
      };
    } catch (error) {
      console.error('Error fetching project stats:', error);
      throw error;
    }
  }
  async findMilestoneByIdOrName(programId: string, value: string): Promise<Milestone | undefined> {
    const milestones = await this.getProgramMilestones(programId);

    // Try to find by ID first
    let milestone = milestones.find(m => m.id === value);
    
    // If not found by ID, try by name
    if (!milestone) {
      milestone = milestones.find(m => m.title.toLowerCase() === value.toLowerCase());
    }
    
    return milestone;
  }
  private processActivityStatsForProgram(activities: any[]): any[] {
    const statsMap = new Map();
    const userSets = new Map();

    activities.forEach(activity => {
      const source = activity.source;
      
      if (!statsMap.has(source)) {
        statsMap.set(source, { source, count: 0 });
        userSets.set(source, new Set());
      }
      
      statsMap.get(source).count++;
      
      const user = activity.user_github || activity.user_discord;
      if (user) {
        userSets.get(source).add(user);
      }
    });

    return Array.from(statsMap.values()).map(stat => ({
      ...stat,
      unique_users: userSets.get(stat.source).size
    }));
  }

  private milestoneProgramProgress(milestones: any[]): any {
    if (milestones.length === 0) {
      return { total_milestones: 0, completed_milestones: 0, average_progress: 0 };
    }
    const sumofProgress = milestones.reduce((sum, m) => sum + (m.progress || 0), 0);
    const completePercent = milestones.length * 100;
    const averageProgress = Math.round((sumofProgress / completePercent) * 100);
    const completedCount = milestones.filter(m => m.status === 'completed').length;

    return {
      total: milestones.length,
      completed: completedCount,
      average_progress: averageProgress
    };
  }
  private projectProgramProgress(projects: any[]): any {
    if (projects.length === 0) {
      const completedCount = projects.filter(m => m.status === 'completed').length;
       const averageProgress = Math.round((completedCount / projects.length) * 100);
       const totalProjects = projects.length;
      return { total: totalProjects, completed: completedCount, average_progress: averageProgress };
    }
  }

  private async isMilestoneBasedProgram(programId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('programs')
        .select('type')
        .eq('id', programId)
        .single();

      if (error) throw error;
      return data?.type === 'milestone_based';
    } catch (error) {
      console.error('Error checking program type:', error);
      throw error;
    }

  }
}




// Export a singleton instance
export const database = new SupabaseDatabase();
export default database;