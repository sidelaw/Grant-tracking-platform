import database from "@/lib/storage";


export async function GET(req: Request) {
    try {
        const programCount = await database.
        getTotalProgramsCount();
        const activeProgramCount = await database.getTotalActiveProgramsCount();
        const delayedProgramCount = await database.getDelayedProgramsCount();
        const totalFundsSpent = await database.getTotalFundsSpent();
        const totalBudget = await database.getTotalBudget();
        const totalAtRisk = await database.getAtRiskProgramsCount();
        
        const stats = {
            programCount,
            activeProgramCount,
            delayedProgramCount,
            totalFundsSpent,
            totalBudget,
            totalAtRisk,
        };
        return new Response(JSON.stringify(stats), { status: 200 });
    } catch (error) {
        console.error('Error fetching program stats:', error);
        throw error;
    }
}