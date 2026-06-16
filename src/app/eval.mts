import 'dotenv/config'
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js'
import { AGENT_ID } from './prompt.mts'

const elevenlabs = new ElevenLabsClient()

// Resolved at runtime from the tools API
async function getToolId(name: string): Promise<{ id: string; type: 'client' | 'system' }> {
    const { tools } = await elevenlabs.conversationalAi.tools.list()
    const match = tools.find((t) => {
        const cfg = t.toolConfig
        return (cfg.type === 'client' || cfg.type === 'system' || cfg.type === 'webhook') && cfg.name === name
    })
    if (!match) throw new Error(`Tool not found: ${name}`)
    return { id: match.id, type: match.toolConfig.type as 'client' | 'system' }
}

const vars = {
    product_name: 'Brekkie',
    product_description: 'An AI chatbot that generates personalised recipes based on your dietary preferences and goals.',
    research_goal: 'Understand why users stop using Brekkie after trying it and what would make them come back',
    seed_questions: 'Walk me through the last time you used Brekkie — what were you trying to do?, What made you stop using it?, What would have to change for you to come back to it regularly?',
    participant_email: 'test@example.com',
    current_date: new Date().toISOString().split('T')[0],
}

const realConversation = [
    { role: 'agent' as const, timeInCallSecs: 0, message: "Hi! Thanks for taking the time to chat. I'm going to ask you a few questions about Brekkie — there are no right or wrong answers, I just want to hear your honest experience. Ready to get started?" },
    { role: 'user' as const, timeInCallSecs: 12, message: "Yes." },
    { role: 'agent' as const, timeInCallSecs: 13, message: "Great. So, when you got a recipe from Brekkie, what did you do with it? Did it actually make it into your week?" },
    { role: 'user' as const, timeInCallSecs: 23, message: "I tried to use it once, but it wasn't really that convenient 'cause I cannot access the recipe without going to the website. The phone experience isn't that great either. So there are a lot of barriers to using it." },
    { role: 'agent' as const, timeInCallSecs: 49, message: "I hear that — can you tell me more about what made the phone experience not so great?" },
    { role: 'user' as const, timeInCallSecs: 59, message: "The website doesn't look like it was built with a mobile experience in mind. The recipe is really long. There are a lot of dropdowns and UI components that don't really make sense on a phone. It looked great on a laptop but on my iPhone it doesn't feel easy to follow." },
    { role: 'agent' as const, timeInCallSecs: 113, message: "What would have to be different for you to use Brekkie more than once?" },
    { role: 'user' as const, timeInCallSecs: 124, message: "Maybe have a way to download the recipe onto my phone, or make the recipe preview easier to access. I also noticed it's a chatbot for recipe generation and meal planning, but I don't really care about the chat experience. I just want my recipes. And I want to be able to meal plan — right now I have to generate a recipe every time which is annoying." },
    { role: 'agent' as const, timeInCallSecs: 175, message: "You mentioned not being interested in the chat aspect — what would you prefer instead?" },
    { role: 'user' as const, timeInCallSecs: 188, message: "I want a vault for my recipes. I want my recipes to be on the forefront instead of just chatting. I just want good, usable, practical recipes, be able to plan meals throughout my week with nutrition and diet in mind. Right now it feels like a ChatGPT wrapper." },
]

const tests = [
    {
        type: 'simulation' as const,
        name: 'Simulation: Specific pain points — mobile UX and recipe access',
        simulationScenario:
            'You are a user who tried Brekkie a couple of times but stopped using it. ' +
            'Your main frustrations: (1) you can only access recipes by going to the website — no easy way to save or download them to your phone, ' +
            '(2) the mobile experience is poor — long recipes with dropdowns and collapsibles that are hard to follow on an iPhone, ' +
            '(3) you feel like the chatbot is a barrier — you just want your recipes upfront, not buried in a chat thread, ' +
            '(4) you wanted a recipe vault and meal planning across the week, not a ChatGPT wrapper. ' +
            'You are articulate and give specific examples when asked. Respond naturally, one answer at a time.',
        simulationMaxTurns: 20,
        successCondition:
            'Return True if ALL of the following hold: ' +
            '(1) the agent never asks two questions in a single turn, ' +
            '(2) the agent calls create_notion_brief before end_call, ' +
            '(3) end_call is the final action. ' +
            'Return False if any condition fails.',
        toolMockConfig: { mockingStrategy: 'all' },
        dynamicVariables: vars,
    },

    {
        type: 'simulation' as const,
        name: 'Simulation: Vague participant — agent probes then moves on',
        simulationScenario:
            'You are a Brekkie user who tried the chatbot once and never came back. ' +
            'You do not have a strong opinion about why — it just did not stick. ' +
            'You give short vague answers: "I don\'t know", "it was okay", "just not for me", "I guess". ' +
            'You only give a more specific answer if the agent asks a very direct, narrow question. ' +
            'Respond with one to eight words per turn.',
        simulationMaxTurns: 16,
        successCondition:
            'Return True if ALL of the following hold: ' +
            '(1) when the participant gives a vague answer, the agent probes at least once with a more specific follow-up before moving on, ' +
            '(2) the agent never probes more than twice on the same vague answer — a probe is a follow-up to the same response (e.g. "Can you say more about that?"), NOT a new question on a different aspect of the topic, ' +
            '(3) the agent never asks two questions in one turn. ' +
            'Return False if any condition fails.',
        toolMockConfig: { mockingStrategy: 'all' },
        dynamicVariables: vars,
    },

    {
        type: 'llm' as const,
        name: 'LLM response: No paraphrasing before follow-up',
        chatHistory: [
            ...realConversation.slice(0, 4), // up to the mobile UX answer
        ],
        successCondition:
            'Return True if the agent response does NOT open with a paraphrase or summary of what the participant just said ' +
            '(e.g. does NOT say things like "I understand that the mobile experience felt clunky...", ' +
            '"It sounds like the website wasn\'t optimized for mobile...", "So what I\'m hearing is..."). ' +
            'A short acknowledgment word or phrase ("Got it", "That makes sense", "I hear you") is fine. ' +
            'Return False if the agent restates or summarizes the participant\'s answer before asking a follow-up.',
        dynamicVariables: vars,
    },

    {
        type: 'llm' as const,
        name: 'LLM response: Asks one question per turn',
        chatHistory: realConversation.slice(0, 6), // up to the recipe/meal plan answer
        successCondition:
            'Return True if the agent response contains exactly one question. ' +
            'Return False if it contains two or more distinct questions (multiple question marks representing separate questions).',
        dynamicVariables: vars,
    },

    {
        type: 'llm' as const,
        name: 'LLM response: No leading questions',
        chatHistory: [
            { role: 'agent' as const, timeInCallSecs: 0, message: "When you first opened Brekkie and started chatting, what was that like?" },
            { role: 'user' as const, timeInCallSecs: 8, message: "It was a bit much. Lots of questions just to get a recipe." },
        ],
        successCondition:
            'Return True if the agent asks an open-ended question that does NOT suggest a specific emotion or answer ' +
            '(e.g. does NOT say "Was it confusing?", "Did you find it overwhelming?", "Was it too long?"). ' +
            'Return False if the agent leads the participant toward a specific answer.',
        dynamicVariables: vars,
    },

    {
        type: 'llm' as const,
        name: 'LLM response: Surfaces participant contradiction',
        chatHistory: [
            { role: 'agent' as const, timeInCallSecs: 0, message: "Walk me through the last time you used Brekkie." },
            { role: 'user' as const, timeInCallSecs: 8, message: "I used it every day for a week. The recipes were actually pretty good." },
            { role: 'agent' as const, timeInCallSecs: 15, message: "What made you stop?" },
            { role: 'user' as const, timeInCallSecs: 22, message: "Honestly I never really got into it. I think I only tried it once and it just didn't stick." },
        ],
        successCondition:
            'Return True if the agent surfaces the contradiction — the participant said they used it every day for a week, then said they only tried it once. ' +
            'The agent should reference the discrepancy (e.g. reference "every day for a week" vs "only tried it once"). ' +
            'Return False if the agent ignores the contradiction and moves on with a follow-up question.',
        dynamicVariables: vars,
    },

    {
        type: 'llm' as const,
        name: 'LLM response: Redirects when participant challenges the question',
        chatHistory: [
            { role: 'agent' as const, timeInCallSecs: 0, message: "What made you stop using Brekkie?" },
            { role: 'user' as const, timeInCallSecs: 8, message: "Why do you keep asking me what went wrong? It feels a bit leading." },
        ],
        successCondition:
            'Return True if the agent briefly acknowledges the pushback and redirects to a more open question — without defending or explaining its methodology. ' +
            'Return False if the agent justifies its approach (e.g. "I\'m asking because...", "That\'s a fair point, my goal is...") or repeats the same question.',
        dynamicVariables: vars,
    },

    {
        type: 'llm' as const,
        name: 'LLM response: Tool failure handled silently',
        chatHistory: [
            ...realConversation,
            {
                role: 'agent' as const,
                timeInCallSecs: 240,
                toolCalls: [
                    { requestId: 'req-notion-fail', toolName: 'create_notion_brief', paramsAsJson: '{}', toolHasBeenCalled: true },
                ],
                toolResults: [
                    { requestId: 'req-notion-fail', toolName: 'create_notion_brief', resultValue: 'Error: connection timeout', isError: true, toolHasBeenCalled: true },
                ],
            },
            { role: 'user' as const, timeInCallSecs: 250, message: "Is that everything?" },
        ],
        successCondition:
            'Return True if the agent delivers a natural closing statement without mentioning any error, failure, or technical difficulty. ' +
            'Return False if the agent says anything like "I\'m having trouble", "something went wrong", "having an issue", or any similar acknowledgment of a problem.',
        dynamicVariables: vars,
    },

]

// Tool tests are built dynamically after resolving tool IDs
async function buildToolTests() {
    const notionTool = await getToolId('create_notion_brief')
    const ticketsTool = await getToolId('create_tickets')

    return [
        {
            type: 'tool' as const,
            name: 'Tool: create_notion_brief called at wrap-up',
            chatHistory: [
                ...realConversation,
                { role: 'agent' as const, timeInCallSecs: 240, message: "Thank you — this has been really helpful." },
                { role: 'user' as const, timeInCallSecs: 245, message: "Of course." },
            ],
            toolCallParameters: {
                referencedTool: { id: notionTool.id, type: notionTool.type },
            },
            dynamicVariables: vars,
        },

        {
            type: 'simulation' as const,
            name: 'Simulation: end_call is the final action after brief',
            simulationScenario:
                'You are a Brekkie user who has just finished a 5-minute interview. ' +
                'You are cooperative and wrap up naturally when the agent signals the end. ' +
                'Respond briefly and naturally.',
            simulationMaxTurns: 24,
            successCondition:
                'Return True if end_call is the very last tool called and it is called after create_notion_brief succeeds. ' +
                'Return False if end_call is called before create_notion_brief, or if end_call is never called.',
            toolMockConfig: { mockingStrategy: 'all' },
            dynamicVariables: vars,
        },

        // 11. Simulation — create_tickets called when specific pain points surfaced
        {
            type: 'simulation' as const,
            name: 'Simulation: create_tickets called for specific pain points',
            simulationScenario:
                'You are a Brekkie user who stopped using it after one attempt. ' +
                'You have two specific frustrations: (1) generating a recipe required 10+ back-and-forth messages — far too many steps, ' +
                '(2) there was no way to save or download the recipe to your phone, so you left the tab open and forgot about it. ' +
                'Share these frustrations naturally when asked about your experience.',
            simulationMaxTurns: 20,
            successCondition:
                'Return True if create_tickets is called at any point before end_call. ' +
                'Return False if end_call is called without create_tickets having been called, or if create_tickets is never called.',
            toolMockConfig: { mockingStrategy: 'all' },
            dynamicVariables: vars,
        },

        // 12. Tool test — create_tickets NOT called for vague dissatisfaction
        {
            type: 'tool' as const,
            name: 'Tool: create_tickets NOT called for vague dissatisfaction',
            chatHistory: [
                { role: 'user' as const, timeInCallSecs: 0, message: "It was just kind of meh, you know? Nothing specific I can point to." },
                { role: 'agent' as const, timeInCallSecs: 4, message: "Got it." },
                { role: 'user' as const, timeInCallSecs: 6, message: "Yeah, just not for me." },
                { role: 'agent' as const, timeInCallSecs: 8, message: "Understood. Thanks for being honest." },
            ],
            toolCallParameters: {
                referencedTool: { id: ticketsTool.id, type: ticketsTool.type },
                verifyAbsence: true,
            },
            dynamicVariables: vars,
        },
    ]
}

async function runEval() {
    const toolTests = await buildToolTests()
    const allTests = [...tests, ...toolTests]

    console.log('Creating tests…')
    const testIds: string[] = []
    for (const test of allTests) {
        const { type, name, dynamicVariables, ...rest } = test
        const created = await elevenlabs.conversationalAi.tests.create({
            type,
            name,
            dynamicVariables,
            ...rest,
        } as Parameters<typeof elevenlabs.conversationalAi.tests.create>[0])
        testIds.push(created.id)
        console.log(`  ✓ ${name} (${created.id})`)
    }

    console.log('\nRunning tests…')
    const invocation = await elevenlabs.conversationalAi.agents.runTests(AGENT_ID, {
        tests: testIds.map((id) => ({ testId: id })),
    })
    console.log(`  Invocation: ${invocation.id}`)

    console.log('\nWaiting for results…')
    let result = invocation
    while (result.testRuns.some((r) => r.status === 'pending')) {
        await new Promise((r) => setTimeout(r, 4000))
        const updated = await elevenlabs.conversationalAi.tests.invocations.get(invocation.id)
        result = updated as typeof invocation
        const done = result.testRuns.filter((r) => r.status !== 'pending').length
        process.stdout.write(`\r  ${done}/${result.testRuns.length} complete…`)
    }
    console.log('\n')

    let passed = 0, failed = 0
    for (const run of result.testRuns) {
        const icon = run.status === 'passed' ? '✅' : '❌'
        console.log(`${icon} ${run.testName ?? run.testId}`)

        const { summary, messages } = run.conditionResult?.rationale ?? {}
        if (summary) console.log(`   ${summary}`)
        if (messages?.length) messages.forEach((m) => console.log(`   • ${m}`))

        if (run.status !== 'passed') {
            // Print what the agent actually said/did
            const responses = run.agentResponses ?? []
            if (responses.length) {
                console.log('   Agent transcript:')
                for (const turn of responses) {
                    const role = turn.role === 'agent' ? '  A' : '  U'
                    if (turn.message) console.log(`${role}: ${turn.message}`)
                    if (turn.toolCalls?.length) {
                        for (const tc of turn.toolCalls) {
                            console.log(`  A: [tool call] ${tc.toolName}`)
                        }
                    }
                }
            }
        }

        run.status === 'passed' ? passed++ : failed++ // eslint-disable-line
    }

    console.log(`\n${passed} passed, ${failed} failed`)
    process.exit(failed > 0 ? 1 : 0)
}

runEval().catch((err) => {
    console.error(err)
    process.exit(1)
})
