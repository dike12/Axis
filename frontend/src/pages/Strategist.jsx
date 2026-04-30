import React, { useState, useRef, useEffect } from "react";
import { Mic, Send, Brain, Sparkles, ArrowRight, Zap, ChevronDown, BookOpen, GraduationCap, Lightbulb, HelpCircle } from "lucide-react";
import Header from "../components/Header";
import { cn } from "../lib/utils"; 

// --- Glossary ---
const glossary = {
  "Zero-Based Budgeting": "A method where every dollar of income is assigned a job — expenses, savings, or debt — so income minus outgo equals zero.",
  "4% Rule": "A retirement guideline suggesting you can withdraw 4% of your portfolio annually without running out of money over 30 years.",
  "Emergency Fund": "3-6 months of living expenses kept in a liquid, accessible account for unexpected costs.",
  "Debt-to-Income": "The percentage of your gross monthly income that goes toward debt payments. Lower is better.",
  "Dollar-Cost Averaging": "Investing a fixed amount at regular intervals regardless of price, reducing the impact of volatility.",
  "Compound Interest": "Interest earned on both the initial principal and previously accumulated interest — the 'snowball' effect.",
  "Sinking Fund": "Money set aside over time for a planned future expense, like a vacation or car repair.",
  "FIRE": "Financial Independence, Retire Early — a movement focused on extreme savings and investment to retire well before 65.",
  "Avalanche Method": "Pay off debts starting with the highest interest rate first, saving the most money over time.",
  "Snowball Method": "Pay off debts starting with the smallest balance first, building psychological momentum.",
};

function highlightTerms(text) {
  const parts = [];
  let remaining = text;
  const terms = Object.keys(glossary).sort((a, b) => b.length - a.length);

  while (remaining.length > 0) {
    let earliestIdx = remaining.length;
    let matchedTerm = "";
    for (const term of terms) {
      const idx = remaining.toLowerCase().indexOf(term.toLowerCase());
      if (idx !== -1 && idx < earliestIdx) { earliestIdx = idx; matchedTerm = term; }
    }
    if (!matchedTerm) { parts.push(remaining); break; }
    if (earliestIdx > 0) parts.push(remaining.slice(0, earliestIdx));
    
    const originalText = remaining.slice(earliestIdx, earliestIdx + matchedTerm.length);
    parts.push(
      <span key={`${matchedTerm}-${earliestIdx}`} className="group/glossary relative inline-block">
        <span className="underline decoration-violet-400/60 decoration-dotted underline-offset-4 cursor-help text-violet-300 font-medium">
          {originalText}
        </span>
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-md bg-[#11141B] border border-violet-500/30 text-sm shadow-xl opacity-0 pointer-events-none group-hover/glossary:opacity-100 transition-opacity z-[60] w-max max-w-xs">
          <span className="block font-semibold text-violet-300 mb-1">{matchedTerm}</span>
          <span className="block text-gray-300 leading-relaxed">{glossary[matchedTerm]}</span>
        </span>
      </span>
    );
    remaining = remaining.slice(earliestIdx + matchedTerm.length);
  }
  return parts;
}

function ConceptCardBlock({ card }) {
  const [expanded, setExpanded] = useState(false);
  const icons = { book: BookOpen, lightbulb: Lightbulb, graduation: GraduationCap };
  const Icon = icons[card.icon];
  
  return (
    <div className="my-3 rounded-xl border border-violet-500/20 bg-violet-500/5 overflow-hidden">
      <div className="px-4 py-3 flex items-start gap-3">
        <div className="mt-0.5 w-7 h-7 rounded-lg bg-violet-500/15 flex items-center justify-center flex-shrink-0">
          <Icon className="h-3.5 w-3.5 text-violet-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold text-violet-300 uppercase tracking-wider">{card.title}</p>
          <p className="text-sm text-gray-300 mt-1 leading-relaxed">{card.summary}</p>
        </div>
      </div>
      <button 
        onClick={() => setExpanded(!expanded)} 
        className="w-full px-4 py-2 flex items-center gap-1.5 text-xs font-medium text-violet-400 hover:text-violet-300 transition-colors border-t border-violet-500/10 hover:bg-violet-500/10"
      >
        <ChevronDown className={cn("h-3 w-3 transition-transform", expanded && "rotate-180")} />
        {expanded ? "Hide Details" : "Learn More"}
      </button>
      {expanded && <div className="px-4 pb-4 pt-1 text-sm text-gray-400 leading-relaxed">{card.detail}</div>}
    </div>
  );
}

function WhyBlock({ explanations }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3">
      <button 
        onClick={() => setOpen(!open)} 
        className="flex items-center gap-1.5 text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
      >
        <HelpCircle className="h-3.5 w-3.5" />
        <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
        Why this matters
      </button>
      {open && (
        <div className="mt-2.5 space-y-2 pl-1 border-l-2 border-indigo-500/20 ml-1.5">
          {explanations.map((e, i) => (
            <div key={i} className="pl-3 py-0.5">
              <p className="text-sm text-gray-400 leading-relaxed">
                <span className="font-medium text-indigo-300 mr-1.5">{e.action}:</span> 
                {e.impact}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Mock AI responses ---
const simulatorResponses = [
  { 
    id: "sim-1", role: "ai", 
    content: "Based on your situation, let's look at this through the lens of Zero-Based Budgeting. Your current dining expenses of $450/mo are consuming 12% of take-home pay. By reducing to $200, you'd free up $250/mo — that's $3,000/year redirected to your Emergency Fund. With Compound Interest working in your favor, this alone could add ~$18,000 over 5 years.", 
    whyExplanations: [
      { action: "Cut dining to $200/mo", impact: "Adds 2.4 months to your survival runway and $3,000/yr toward your Emergency Fund." }, 
      { action: "Redirect to investments", impact: "With Compound Interest at 7% avg return, $250/mo becomes ~$18,000 in 5 years." }
    ] 
  },
  { 
    id: "sim-2", role: "ai", 
    content: "Your Debt-to-Income ratio is currently at 28%, which is in the cautionary zone. If we apply Dollar-Cost Averaging to your investment contributions while simultaneously attacking high-interest debt, your FIRE timeline shortens by approximately 3 years. Consider setting up a Sinking Fund for that car repair instead of using credit.", 
    conceptCard: { title: "Avalanche Method vs. Snowball Method", summary: "Two popular strategies for paying off debt — one saves more money, the other builds momentum faster.", detail: "The Avalanche Method targets the highest-interest debt first, mathematically saving you the most money over time. The Snowball Method pays off the smallest balance first, giving quick psychological wins. Both work — the best choice depends on whether you're motivated more by math or momentum.", icon: "lightbulb" }, 
    whyExplanations: [
      { action: "Attack high-interest debt first", impact: "Reduces total interest paid by ~$2,400 over the life of the loans." }, 
      { action: "Use a Sinking Fund for car repair", impact: "Avoids adding $1,500+ in new high-interest debt." }
    ] 
  },
  { 
    id: "sim-3", role: "ai", 
    content: "Looking at your numbers through the 4% Rule, you'd need roughly $1.2M invested to sustain your current lifestyle. You're at 34% of that goal. By implementing the changes we discussed — cutting discretionary spending and increasing your savings rate to 35% — your freedom date moves from 2041 to 2037.", 
    whyExplanations: [{ action: "Increase savings rate to 35%", impact: "Moves your freedom date forward by ~4 years, from 2041 to 2037." }] 
  },
];

const mentorResponses = [
  { 
    id: "ment-1", role: "ai", 
    content: "Let's start with the fundamentals. Before we crunch any numbers, I want to help you build a strong mental model of how money actually works. Most people think about money as 'what I earn minus what I spend.' But the real power comes from understanding Compound Interest — your money making money on its own.", 
    conceptCard: { title: "Compound Interest: The 8th Wonder", summary: "Einstein reportedly called it the most powerful force in the universe. Here's why it matters for you.", detail: "Imagine you invest $200/month at a 7% annual return. In 10 years, you'll have contributed $24,000 — but your account will hold ~$34,500. That extra $10,500? That's compound interest. The longer you leave it, the faster it grows. At 20 years, your $48,000 in contributions becomes ~$98,000. Time is the secret ingredient.", icon: "graduation" }, 
    coachingQuestion: "Before we go further — what's your emotional relationship with saving money? Do you see it as 'giving something up' or as 'paying your future self'?" 
  },
  { 
    id: "ment-2", role: "ai", 
    content: "Great insight. Many people carry emotional patterns around spending that go back to childhood. Let's look at Zero-Based Budgeting — it's not about restriction, it's about intention. Every dollar gets a purpose before the month begins.", 
    conceptCard: { title: "Zero-Based Budgeting 101", summary: "Give every dollar a job. Income minus all allocations should equal zero.", detail: "Step 1: List your monthly income. Step 2: Assign every dollar to a category — rent, groceries, fun, savings, debt. Step 3: The total should equal your income exactly. This doesn't mean spending everything — savings and investments are categories too. The key is no dollar is 'unaccounted for.' This eliminates the mystery of 'where did my money go?'", icon: "book" }, 
    coachingQuestion: "Think about last month — can you identify one expense that surprised you when you saw the total? That's usually the best place to start." 
  },
  { 
    id: "ment-3", role: "ai", 
    content: "You're making great progress understanding these concepts. Now let's talk about the 4% Rule and what financial freedom actually means in practical terms. It's simpler than most people think.", 
    conceptCard: { title: "The 4% Rule & Your Freedom Number", summary: "How much do you actually need to never worry about money again?", detail: "Take your annual expenses and multiply by 25. That's your 'Freedom Number.' If you spend $40,000/year, you need $1,000,000 invested. The 4% Rule says you can withdraw 4% of your portfolio each year and historically it would last 30+ years. This isn't about being a millionaire for status — it's about buying back your time.", icon: "graduation" }, 
    coachingQuestion: "What would you do with your time if money wasn't a constraint? This isn't a dream question — it's the foundation of your financial plan." 
  },
];

const initialLibrary = [
  { id: "emergency-fund", title: "Emergency Fund: 101", description: "Why you need 3-6 months of expenses in a liquid account before investing.", unlocked: false },
  { id: "compound-interest", title: "The Power of Compound Interest", description: "How your money grows exponentially over time and why starting early matters.", unlocked: false },
  { id: "zero-based", title: "Zero-Based Budgeting", description: "Assign every dollar a job so nothing slips through the cracks.", unlocked: false },
  { id: "debt-strategies", title: "Debt Payoff Strategies", description: "Avalanche vs. Snowball — choose the method that fits your personality.", unlocked: false },
  { id: "fire-movement", title: "FIRE: Financial Independence", description: "The path to retiring early through aggressive saving and smart investing.", unlocked: false },
  { id: "investing-basics", title: "Investing: The Basics", description: "Stocks, bonds, index funds — a beginner's guide to growing wealth.", unlocked: false },
  { id: "4-percent-rule", title: "The 4% Rule Explained", description: "How much you really need to retire and live off your investments.", unlocked: false },
  { id: "dollar-cost-avg", title: "Dollar-Cost Averaging", description: "Why investing consistently beats trying to time the market.", unlocked: false },
];

const unlockMap = {
  "sim-1": ["emergency-fund", "compound-interest", "zero-based"],
  "sim-2": ["debt-strategies", "dollar-cost-avg"],
  "sim-3": ["4-percent-rule", "fire-movement"],
  "ment-1": ["compound-interest"],
  "ment-2": ["zero-based"],
  "ment-3": ["4-percent-rule", "fire-movement"],
};

// --- MAIN COMPONENT ---
export default function Strategist({ toggleSidebar }) {
  const [isMobile, setIsMobile] = useState(false);
  const [activeTab, setActiveTab] = useState("chat");
  const [mode, setMode] = useState("simulator");
  const [messages, setMessages] = useState([{ 
    id: "welcome", role: "ai", 
    content: "Welcome to your financial strategy session. Tell me about your financial situation — your income, expenses, goals, and concerns. I'll help you simulate a better path forward using Zero-Based Budgeting principles and the 4% Rule as our guide." 
  }]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [responseIndex, setResponseIndex] = useState(0);
  const [library, setLibrary] = useState(initialLibrary);
  const [showLibrary, setShowLibrary] = useState(false);
  
  const messagesEndRef = useRef(null);

  // Simulation State
  const [currentPath] = useState({ runway: 4.2, freedomYear: 2041, monthlySurplus: 320 });
  const [suggestedPath, setSuggestedPath] = useState({ runway: 8.5, freedomYear: 2037, monthlySurplus: 870 });
  const [sliders, setSliders] = useState([
    { id: "dining", label: "Dining Out", current: 450, suggested: 200, min: 0, max: 600, value: 200 },
    { id: "subscriptions", label: "Subscriptions", current: 120, suggested: 45, min: 0, max: 200, value: 45 },
    { id: "savings-rate", label: "Savings Rate %", current: 15, suggested: 35, min: 5, max: 60, value: 35 },
  ]);

  // Handle Mobile Resize
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Auto-scroll chat
  useEffect(() => { 
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); 
  }, [messages, isThinking]);

  // Update simulation math
  useEffect(() => {
    const diningSlider = sliders.find((s) => s.id === "dining");
    const subsSlider = sliders.find((s) => s.id === "subscriptions");
    const savingsSlider = sliders.find((s) => s.id === "savings-rate");
    
    const diningSavings = (diningSlider?.current ?? 450) - (diningSlider?.value ?? 200);
    const subsSavings = (subsSlider?.current ?? 120) - (subsSlider?.value ?? 45);
    const totalMonthlySavings = diningSavings + subsSavings;
    const savingsRate = savingsSlider?.value ?? 35;
    
    setSuggestedPath({ 
      runway: Math.round((4.2 + totalMonthlySavings / 800) * 10) / 10, 
      freedomYear: Math.max(2030, 2041 - Math.floor(savingsRate / 5)), 
      monthlySurplus: 320 + totalMonthlySavings 
    });
  }, [sliders]);

  const unlockTopics = (msgId) => {
    const topicIds = unlockMap[msgId];
    if (!topicIds) return;
    setLibrary((prev) => prev.map((t) => (topicIds.includes(t.id) ? { ...t, unlocked: true } : t)));
  };

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg = { id: Date.now().toString(), role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsThinking(true);
    
    const responses = mode === "mentor" ? mentorResponses : simulatorResponses;
    
    setTimeout(() => {
      const aiMsg = { ...responses[responseIndex % responses.length], id: (Date.now() + 1).toString() };
      setMessages((prev) => [...prev, aiMsg]);
      unlockTopics(responses[responseIndex % responses.length].id);
      setResponseIndex((i) => i + 1);
      setIsThinking(false);
    }, 1500);
  };

  const updateSlider = (id, value) => {
    setSliders((prev) => prev.map((s) => (s.id === id ? { ...s, value } : s)));
  };

  const unlockedCount = library.filter((t) => t.unlocked).length;

  // --- PANELS ---

  const chatPanel = (
    <div className="flex flex-col h-full bg-[#0B0E14]">
      {/* Chat Header */}
      <div className="px-6 py-5 border-b border-gray-800 bg-[#0B0E14]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Brain className="h-5 w-5 text-violet-400" />
              {mode === "mentor" ? "Mentor Journal" : "Strategy Journal"}
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              {mode === "mentor" ? "Learn the concepts behind the numbers" : "Your private financial consultation"}
            </p>
          </div>
          <button 
            onClick={() => setShowLibrary(!showLibrary)} 
            className={cn("relative p-2 rounded-lg transition-colors", showLibrary ? "text-violet-400 bg-violet-500/10" : "text-gray-400 hover:text-violet-400 hover:bg-gray-800/50")}
          >
            <BookOpen className="h-5 w-5" />
            {unlockedCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-violet-500 text-[10px] font-bold text-white flex items-center justify-center">
                {unlockedCount}
              </span>
            )}
          </button>
        </div>
        
        {/* Toggle Switch */}
        <div className="flex items-center gap-3 mt-4 p-2.5 rounded-lg bg-[#11141B] border border-gray-800 w-max">
          <span className={cn("text-xs font-medium transition-colors", mode === "simulator" ? "text-indigo-400" : "text-gray-500")}>Simulator</span>
          <button 
            type="button" 
            role="switch" 
            aria-checked={mode === "mentor"} 
            onClick={() => setMode(mode === "mentor" ? "simulator" : "mentor")}
            className={cn("relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors", mode === "mentor" ? "bg-violet-500" : "bg-indigo-500")}
          >
            <span className={cn("pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform", mode === "mentor" ? "translate-x-5" : "translate-x-0")} />
          </button>
          <span className={cn("text-xs font-medium transition-colors", mode === "mentor" ? "text-violet-400" : "text-gray-500")}>Mentor</span>
        </div>
      </div>

      {/* Library Dropdown */}
      {showLibrary && (
        <div className="border-b border-gray-800 bg-[#11141B] max-h-[300px] overflow-y-auto custom-scrollbar shadow-xl z-10">
          <div className="px-6 py-4">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-2">
              <GraduationCap className="h-4 w-4" />
              Your Financial Library
              <span className="ml-auto text-violet-400">{unlockedCount}/{library.length}</span>
            </h3>
            <div className="space-y-2">
              {library.map((topic) => (
                <div key={topic.id} className={cn("px-4 py-3 rounded-xl text-sm transition-all", topic.unlocked ? "bg-violet-500/10 border border-violet-500/20" : "bg-[#1A1F26]/50 border border-gray-800/50 opacity-60")}>
                  <div className="flex items-center gap-2.5">
                    {topic.unlocked ? <BookOpen className="h-4 w-4 text-violet-400 flex-shrink-0" /> : <div className="w-4 h-4 rounded-full border border-gray-600 flex-shrink-0" />}
                    <span className={cn("font-medium", topic.unlocked ? "text-white" : "text-gray-500")}>{topic.title}</span>
                  </div>
                  {topic.unlocked && <p className="text-xs text-gray-400 mt-1.5 pl-6">{topic.description}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 custom-scrollbar">
        {messages.map((msg) => (
          <div key={msg.id}>
            <div className={cn("flex gap-4", msg.role === "user" ? "justify-end" : "justify-start")}>
              {msg.role === "ai" && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mt-1 shadow-lg shadow-violet-500/20">
                  {mode === "mentor" ? <GraduationCap className="h-4 w-4 text-white" /> : <Sparkles className="h-4 w-4 text-white" />}
                </div>
              )}
              <div className={cn("max-w-[85%] text-sm leading-relaxed", msg.role === "user" ? "bg-[#1A1F26] border border-gray-700/50 rounded-2xl rounded-br-sm px-5 py-3.5 text-white shadow-sm" : "text-gray-200 pt-1.5")}>
                {msg.role === "ai" ? highlightTerms(msg.content) : msg.content}
                {msg.role === "ai" && msg.whyExplanations && <WhyBlock explanations={msg.whyExplanations} />}
              </div>
            </div>
            {msg.role === "ai" && msg.conceptCard && (
              <div className="ml-12 mt-2"><ConceptCardBlock card={msg.conceptCard} /></div>
            )}
            {msg.role === "ai" && msg.coachingQuestion && (
              <div className="ml-12 mt-3 px-5 py-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5">
                <p className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider mb-2 flex items-center gap-1.5"><HelpCircle className="h-3.5 w-3.5" />Coaching Question</p>
                <p className="text-sm text-gray-300 italic">{msg.coachingQuestion}</p>
              </div>
            )}
          </div>
        ))}
        
        {/* Thinking Indicator */}
        {isThinking && (
          <div className="flex gap-4 items-start">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20 animate-pulse">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div className="flex items-center gap-1.5 pt-3">
              <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="px-6 py-5 border-t border-gray-800 bg-[#0B0E14]">
        <div className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder={mode === "mentor" ? "Ask me anything about personal finance..." : "Tell me your situation..."}
            className="flex min-h-[85px] max-h-[160px] w-full rounded-xl border border-gray-700 bg-[#11141B] px-4 py-3 pr-24 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 resize-none transition-colors"
          />
          <div className="absolute bottom-3 right-3 flex items-center gap-2">
            <button className="p-2 text-gray-500 hover:text-violet-400 transition-colors rounded-lg hover:bg-[#1A1F26]">
              <Mic className="h-4 w-4" />
            </button>
            <button 
              onClick={handleSend} 
              disabled={!input.trim() || isThinking}
              className="p-2.5 bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg shadow-lg shadow-violet-500/20 transition-all"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const simulationPanel = (
    <div className={cn("flex flex-col h-full overflow-y-auto bg-[#11141B] custom-scrollbar", isThinking && "opacity-80 transition-opacity")}>
      <div className="px-8 py-5 border-b border-gray-800 sticky top-0 bg-[#11141B]/90 backdrop-blur-md z-10">
        <h2 className="text-lg font-semibold flex items-center gap-2 text-white">
          <Zap className="h-5 w-5 text-indigo-400" />
          Live Simulation
        </h2>
        <p className="text-xs text-gray-400 mt-1">Impact of your strategy changes</p>
      </div>
      
      <div className="p-8 space-y-8">
        
        {/* Before vs After Cards */}
        <div>
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-4">Before vs. After</h3>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            
            <div className="rounded-xl border border-gray-800 bg-[#1A1F26]/40 p-5 space-y-4">
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Current Path</p>
              <div>
                <p className="text-2xl font-bold text-white">{currentPath.runway}<span className="text-sm font-normal text-gray-500 ml-1">mo</span></p>
                <p className="text-xs text-gray-400 mt-0.5">Runway</p>
              </div>
              <div>
                <p className="text-xl font-bold text-white">{currentPath.freedomYear}</p>
                <p className="text-xs text-gray-400 mt-0.5">Freedom Date</p>
              </div>
              <div>
                <p className="text-xl font-bold text-white">${currentPath.monthlySurplus}<span className="text-sm font-normal text-gray-500">/mo</span></p>
                <p className="text-xs text-gray-400 mt-0.5">Surplus</p>
              </div>
            </div>

            <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-5 space-y-4 relative overflow-hidden shadow-inner">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-indigo-500/10 pointer-events-none" />
              <div className="relative z-10">
                <p className="text-[11px] font-semibold text-violet-400 uppercase tracking-wider">Suggested Path</p>
                <div className="mt-4">
                  <p className="text-2xl font-bold text-emerald-400">{suggestedPath.runway}<span className="text-sm font-normal text-emerald-400/60 ml-1">mo</span></p>
                  <p className="text-xs text-violet-300/70 mt-0.5">Runway</p>
                </div>
                <div className="mt-4">
                  <p className="text-xl font-bold text-emerald-400">{suggestedPath.freedomYear}</p>
                  <p className="text-xs text-violet-300/70 mt-0.5">Freedom Date</p>
                </div>
                <div className="mt-4">
                  <p className="text-xl font-bold text-emerald-400">${suggestedPath.monthlySurplus}<span className="text-sm font-normal text-emerald-400/60">/mo</span></p>
                  <p className="text-xs text-violet-300/70 mt-0.5">Surplus</p>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Sliders Area */}
        <div>
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-5">What-If Adjustments</h3>
          <div className="space-y-8">
            {sliders.map((s) => (
              <div key={s.id} className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white font-medium">{s.label}</span>
                  <span className="text-violet-300 font-semibold bg-violet-500/10 px-2.5 py-1 rounded-md border border-violet-500/20">
                    {s.id === "savings-rate" ? `${s.value}%` : `$${s.value}`}
                  </span>
                </div>
                
                {/* Custom Tailwind CSS Webkit Slider */}
                <input
                  type="range"
                  value={s.value}
                  min={s.min}
                  max={s.max}
                  step={s.id === "savings-rate" ? 1 : 10}
                  onChange={(e) => updateSlider(s.id, Number(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer bg-gray-800 
                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 
                    [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-violet-500 [&::-webkit-slider-thumb]:cursor-pointer 
                    [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md"
                />
                
                <div className="flex justify-between text-[10px] uppercase tracking-wider text-gray-500">
                  <span>Current: {s.id === "savings-rate" ? `${s.current}%` : `$${s.current}`}</span>
                  <span className="text-violet-400/70">Target: {s.id === "savings-rate" ? `${s.suggested}%` : `$${s.suggested}`}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button className="w-full h-12 mt-4 flex items-center justify-center bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white text-sm font-semibold rounded-xl shadow-lg shadow-violet-500/20 transition-all hover:shadow-violet-500/30 hover:scale-[1.01]">
          <Sparkles className="h-4 w-4 mr-2" />
          Apply Strategy to Budget
          <ArrowRight className="h-4 w-4 ml-2" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col w-full min-h-screen bg-[#0B0E14] text-white font-sans">
      
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#0B0E14]">
        <Header title="Strategist" toggleSidebar={toggleSidebar} />
      </div>

      {/* Split Pane Area */}
      <div className="p-8 h-[calc(100vh-4rem)]">
        {isMobile ? (
          <div className="flex flex-col h-full border border-gray-800 rounded-xl overflow-hidden bg-[#0B0E14]">
            <div className="flex border-b border-gray-800 bg-[#11141B]">
              <button 
                onClick={() => setActiveTab("chat")} 
                className={cn("flex-1 py-3.5 text-sm font-medium transition-colors", activeTab === "chat" ? "text-violet-400 border-b-2 border-violet-400 bg-violet-500/5" : "text-gray-400 hover:text-white")}
              >
                <Brain className="h-4 w-4 inline mr-2" />Journal
              </button>
              <button 
                onClick={() => setActiveTab("simulation")} 
                className={cn("flex-1 py-3.5 text-sm font-medium transition-colors", activeTab === "simulation" ? "text-indigo-400 border-b-2 border-indigo-400 bg-indigo-500/5" : "text-gray-400 hover:text-white")}
              >
                <Zap className="h-4 w-4 inline mr-2" />Simulation
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              {activeTab === "chat" ? chatPanel : simulationPanel}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-0 h-full rounded-xl overflow-hidden border border-gray-800 shadow-2xl">
            <div className="border-r border-gray-800 overflow-hidden relative">
              {chatPanel}
            </div>
            <div className="overflow-hidden relative bg-[#11141B]">
              {simulationPanel}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}