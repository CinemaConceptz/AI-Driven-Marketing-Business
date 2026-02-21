"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/providers/AuthProvider";
import { db } from "@/lib/firebase";
import { trackEvent } from "@/lib/analytics/trackEvent";

// 8-Phase Onboarding Structure
const PHASES = [
  { id: 1, name: "Welcome", description: "Professional introduction" },
  { id: 2, name: "Identity", description: "Artist information" },
  { id: 3, name: "Positioning", description: "Sound & style" },
  { id: 4, name: "Catalog", description: "Releases & platforms" },
  { id: 5, name: "Branding", description: "Narrative & direction" },
  { id: 6, name: "Rights", description: "Compliance confirmation" },
  { id: 7, name: "Targeting", description: "Label preferences" },
  { id: 8, name: "Summary", description: "Campaign readiness" },
];

// Maya - The Verified Sound Representative
const REPRESENTATIVE = {
  name: "Maya",
  title: "A&R Representative",
  avatar: "https://api.dicebear.com/7.x/personas/svg?seed=Maya&backgroundColor=0a0f1a",
  greeting: "Hi, I'm Maya",
};

type Message = {
  id: string;
  role: "representative" | "user";
  content: string;
  options?: { label: string; value: string }[];
  inputType?: "text" | "textarea" | "select" | "multiselect" | "confirm";
  inputField?: string;
  required?: boolean;
};

type OnboardingData = {
  // Phase 2 - Identity
  legalName: string;
  artistName: string;
  email: string;
  phone: string;
  location: string;
  yearsActive: string;
  primaryGenre: string;
  secondaryGenres: string[];
  // Phase 3 - Positioning
  soundDescription: string;
  artistInfluences: string[];
  releasingIndependently: boolean;
  previousLabel: boolean;
  exclusiveContract: boolean;
  // Phase 4 - Catalog
  releasedTracks: string;
  spotifyLink: string;
  appleMusicLink: string;
  beatportLink: string;
  upcomingReleases: boolean;
  professionalMaterial: boolean;
  // Phase 5 - Branding
  uniqueValue: string;
  idealListener: string;
  targetMarkets: string[];
  careerObjective: string;
  // Phase 6 - Rights
  rightsConfirmed: boolean;
  // Phase 7 - Targeting
  preferredLabels: string;
  labelPreference: string;
  releaseFrequency: string;
};

const GENRES = [
  "House", "EDM", "Afro", "Disco", "Soulful", "Trance",
  "Techno", "Deep House", "Progressive", "Melodic Techno",
  "Drum & Bass", "Dubstep", "Ambient", "Other",
];

const MARKETS = ["United States", "Europe", "United Kingdom", "Asia", "Global"];

export default function ConversationalOnboarding() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [currentPhase, setCurrentPhase] = useState(1);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    legalName: "",
    artistName: "",
    email: "",
    phone: "",
    location: "",
    yearsActive: "",
    primaryGenre: "",
    secondaryGenres: [],
    soundDescription: "",
    artistInfluences: [],
    releasingIndependently: false,
    previousLabel: false,
    exclusiveContract: false,
    releasedTracks: "",
    spotifyLink: "",
    appleMusicLink: "",
    beatportLink: "",
    upcomingReleases: false,
    professionalMaterial: false,
    uniqueValue: "",
    idealListener: "",
    targetMarkets: [],
    careerObjective: "",
    rightsConfirmed: false,
    preferredLabels: "",
    labelPreference: "",
    releaseFrequency: "",
  });
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  // Check existing onboarding status
  useEffect(() => {
    if (loading || !user) return;
    
    const checkStatus = async () => {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      const userData = userDoc.data();
      if (userData?.onboardingCompleted) {
        router.replace("/dashboard");
        return;
      }
      // Pre-fill email
      setData(prev => ({ ...prev, email: user.email || "" }));
      // Start conversation
      startConversation();
    };
    
    checkStatus();
  }, [user, loading, router]);

  const addMessage = (msg: Omit<Message, "id">) => {
    const newMsg = { ...msg, id: `msg-${Date.now()}-${Math.random()}` };
    setMessages(prev => [...prev, newMsg]);
    return newMsg;
  };

  const typeMessage = async (content: string, options?: Message["options"], inputType?: Message["inputType"], inputField?: string) => {
    setIsTyping(true);
    // Simulate typing delay (40-80ms per character, capped at 2s)
    const delay = Math.min(content.length * 20, 2000);
    await new Promise(r => setTimeout(r, delay));
    setIsTyping(false);
    addMessage({ role: "representative", content, options, inputType, inputField });
  };

  const startConversation = async () => {
    // Phase 1: Welcome - Maya introduces herself
    await typeMessage(
      `${REPRESENTATIVE.greeting}! I'm your A&R Representative here at Verified Sound.\n\nI'll be guiding you through our structured representation onboarding process. This allows us to evaluate your positioning, prepare your professional profile, and determine strategic label compatibility.\n\nI'm excited to learn more about you and your music. Let's get started!`
    );
    
    await new Promise(r => setTimeout(r, 1000));
    
    await typeMessage(
      "To properly structure your representation profile, I'll ask you a series of questions across a few key areas. Please answer each one accurately — the more I know, the better I can position you for success.",
      [{ label: "I'm ready, Maya!", value: "ready" }],
      "confirm"
    );
  };

  const handleUserResponse = async (value: string) => {
    // Add user message
    addMessage({ role: "user", content: value });
    
    // Process based on current phase and question
    await processResponse(value);
  };

  const processResponse = async (value: string) => {
    // Phase progression logic
    if (currentPhase === 1 && value === "ready") {
      setCurrentPhase(2);
      await startPhase2();
    } else if (currentPhase === 2) {
      await handlePhase2Response(value);
    } else if (currentPhase === 3) {
      await handlePhase3Response(value);
    } else if (currentPhase === 4) {
      await handlePhase4Response(value);
    } else if (currentPhase === 5) {
      await handlePhase5Response(value);
    } else if (currentPhase === 6) {
      await handlePhase6Response(value);
    } else if (currentPhase === 7) {
      await handlePhase7Response(value);
    } else if (currentPhase === 8) {
      await handlePhase8Response(value);
    }
  };

  // Phase 2: Artist Identity
  const startPhase2 = async () => {
    setCurrentQuestion(0);
    await typeMessage(
      "Perfect! Let's start with the basics.\n\nFirst, what's your legal name? This is just for documentation purposes — your artist name is what the world will see.",
      undefined,
      "text",
      "legalName"
    );
  };

  const handlePhase2Response = async (value: string) => {
    const questions = [
      { field: "legalName", next: "Great! And what's your artist or stage name? This is how you'll be presented to labels." },
      { field: "artistName", next: "Love it! Where are you based? (City, State/Province, Country)" },
      { field: "location", next: "How many years have you been making music professionally?" },
      { field: "yearsActive", next: "Now let's talk about your sound. What's your primary genre?", type: "select", options: GENRES },
      { field: "primaryGenre", next: "Excellent choice! Do any of these secondary genres also apply to your sound?", type: "multiselect", options: GENRES },
      { field: "secondaryGenres", next: null },
    ];

    const q = questions[currentQuestion];
    
    // Save the value
    if (q.field === "secondaryGenres") {
      setData(prev => ({ ...prev, [q.field]: selectedOptions }));
      setSelectedOptions([]);
    } else {
      setData(prev => ({ ...prev, [q.field]: value }));
    }

    setCurrentQuestion(prev => prev + 1);

    if (currentQuestion < questions.length - 1) {
      const nextQ = questions[currentQuestion + 1];
      if (nextQ.type === "select") {
        await typeMessage(
          nextQ.next!,
          nextQ.options?.map(o => ({ label: o, value: o })),
          "select",
          nextQ.field
        );
      } else if (nextQ.type === "multiselect") {
        await typeMessage(
          nextQ.next!,
          nextQ.options?.map(o => ({ label: o, value: o })),
          "multiselect",
          nextQ.field
        );
      } else {
        await typeMessage(nextQ.next!, undefined, "text", nextQ.field);
      }
    } else {
      // Move to Phase 3
      setCurrentPhase(3);
      setCurrentQuestion(0);
      await typeMessage(
        `Thanks for sharing that, ${data.artistName || "friend"}! I'm already getting a sense of who you are.\n\nNow let's dive deeper into your sound — this helps me understand how to position you with the right labels.`
      );
      await new Promise(r => setTimeout(r, 800));
      await startPhase3();
    }
  };

  // Phase 3: Musical Positioning
  const startPhase3 = async () => {
    await typeMessage(
      "How would you describe your sound to someone who's never heard your music? Give me 2-3 sentences — paint a picture!",
      undefined,
      "textarea",
      "soundDescription"
    );
  };

  const handlePhase3Response = async (value: string) => {
    const questions = [
      { field: "soundDescription", next: "I can picture it! Now, name three artists your sound aligns with — this helps me understand your lane:" },
      { field: "artistInfluences", next: "Are you currently releasing music independently?", type: "confirm", options: ["Yes, independently", "No, not yet"] },
      { field: "releasingIndependently", next: "Have you ever released music under a record label before?", type: "confirm", options: ["Yes, I have", "No, this would be my first"] },
      { field: "previousLabel", next: "Important question: Are you currently under any exclusive agreement with a label or distributor?", type: "confirm", options: ["Yes, I am", "No, I'm free"] },
      { field: "exclusiveContract", next: null },
    ];

    const q = questions[currentQuestion];
    
    // Process and save value
    if (q.field === "artistInfluences") {
      setData(prev => ({ ...prev, [q.field]: value.split(",").map(s => s.trim()) }));
    } else if (q.type === "confirm") {
      setData(prev => ({ ...prev, [q.field]: value.toLowerCase() === "yes" }));
    } else {
      setData(prev => ({ ...prev, [q.field]: value }));
    }

    // Check for exclusivity red flag
    if (q.field === "exclusiveContract" && value.toLowerCase().includes("yes")) {
      await typeMessage(
        "⚠️ I appreciate your honesty.\n\nSince you're under an exclusive agreement, this may affect your eligibility for some opportunities. Don't worry though — our team will review this during evaluation, and there may still be options.\n\nLet's continue with the rest of your profile."
      );
      await new Promise(r => setTimeout(r, 1500));
    }

    setCurrentQuestion(prev => prev + 1);

    if (currentQuestion < questions.length - 1) {
      const nextQ = questions[currentQuestion + 1];
      if (nextQ.type === "confirm") {
        await typeMessage(
          nextQ.next!,
          nextQ.options?.map(o => ({ label: o, value: o })),
          "select",
          nextQ.field
        );
      } else {
        await typeMessage(nextQ.next!, undefined, "textarea", nextQ.field);
      }
    } else {
      // Move to Phase 4
      setCurrentPhase(4);
      setCurrentQuestion(0);
      await typeMessage("Perfect! I'm building a great picture of your sound.");
      await new Promise(r => setTimeout(r, 800));
      await startPhase4();
    }
  };

  // Phase 4: Catalog Assessment
  const startPhase4 = async () => {
    await typeMessage(
      "Now let's talk about your catalog — this helps me gauge your campaign readiness.\n\nHow many tracks have you released so far?",
      undefined,
      "text",
      "releasedTracks"
    );
  };

  const handlePhase4Response = async (value: string) => {
    const questions = [
      { field: "releasedTracks", next: "Great! Drop your Spotify artist link here (or type 'skip' if you don't have one):" },
      { field: "spotifyLink", next: "Apple Music link? (or 'skip'):" },
      { field: "appleMusicLink", next: "Beatport link? (or 'skip'):" },
      { field: "beatportLink", next: "Do you have any releases coming up in the next 90 days?", type: "confirm", options: ["Yes, I do!", "Not at the moment"] },
      { field: "upcomingReleases", next: "Last one for this section — do you have professionally mixed and mastered tracks ready to submit to labels?", type: "confirm", options: ["Yes, ready to go!", "Still working on it"] },
      { field: "professionalMaterial", next: null },
    ];

    const q = questions[currentQuestion];
    
    if (q.type === "confirm") {
      setData(prev => ({ ...prev, [q.field]: value.toLowerCase() === "yes" }));
    } else {
      const cleanValue = value.toLowerCase() === "skip" ? "" : value;
      setData(prev => ({ ...prev, [q.field]: cleanValue }));
    }

    setCurrentQuestion(prev => prev + 1);

    if (currentQuestion < questions.length - 1) {
      const nextQ = questions[currentQuestion + 1];
      if (nextQ.type === "confirm") {
        await typeMessage(
          nextQ.next!,
          nextQ.options?.map(o => ({ label: o, value: o })),
          "select",
          nextQ.field
        );
      } else {
        await typeMessage(nextQ.next!, undefined, "text", nextQ.field);
      }
    } else {
      setCurrentPhase(5);
      setCurrentQuestion(0);
      await typeMessage("Awesome! Your catalog is looking solid.");
      await new Promise(r => setTimeout(r, 800));
      await startPhase5();
    }
  };

  // Phase 5: Branding & Narrative
  const startPhase5 = async () => {
    await typeMessage(
      "Now for the fun part — let's talk about your brand and where you're headed.\n\nWhat makes YOUR project stand out from others in your genre? What's your secret sauce?",
      undefined,
      "textarea",
      "uniqueValue"
    );
  };

  const handlePhase5Response = async (value: string) => {
    const questions = [
      { field: "uniqueValue", next: "Love that! Now, describe your ideal listener. Who's vibing to your music?" },
      { field: "idealListener", next: "Which geographic markets are you targeting? (Select all that apply)", type: "multiselect", options: MARKETS },
      { field: "targetMarkets", next: "Last creative question — where do you see yourself in 2 years? What's the dream?" },
      { field: "careerObjective", next: null },
    ];

    const q = questions[currentQuestion];
    
    if (q.field === "targetMarkets") {
      setData(prev => ({ ...prev, [q.field]: selectedOptions }));
      setSelectedOptions([]);
    } else {
      setData(prev => ({ ...prev, [q.field]: value }));
    }

    setCurrentQuestion(prev => prev + 1);

    if (currentQuestion < questions.length - 1) {
      const nextQ = questions[currentQuestion + 1];
      if (nextQ.type === "multiselect") {
        await typeMessage(
          nextQ.next!,
          nextQ.options?.map(o => ({ label: o, value: o })),
          "multiselect",
          nextQ.field
        );
      } else {
        await typeMessage(nextQ.next!, undefined, "textarea", nextQ.field);
      }
    } else {
      setCurrentPhase(6);
      setCurrentQuestion(0);
      await typeMessage("I love your vision! You've got a clear direction — that's exactly what labels look for.");
      await new Promise(r => setTimeout(r, 800));
      await startPhase6();
    }
  };

  // Phase 6: Rights Confirmation
  const startPhase6 = async () => {
    await typeMessage(
      "Alright, we're almost there! Just need to handle some quick legal stuff.\n\nPlease confirm that you own or legally control all rights to the music you'll be submitting, and that no contracts prevent you from doing so.\n\nJust type CONFIRM when you're ready.",
      [{ label: "CONFIRM ✓", value: "CONFIRM" }],
      "confirm",
      "rightsConfirmed"
    );
  };

  const handlePhase6Response = async (value: string) => {
    if (value.toUpperCase() === "CONFIRM") {
      setData(prev => ({ ...prev, rightsConfirmed: true }));
      setCurrentPhase(7);
      setCurrentQuestion(0);
      await typeMessage("Perfect, thank you! ✓");
      await new Promise(r => setTimeout(r, 800));
      await startPhase7();
    } else {
      await typeMessage(
        "I need your confirmation to proceed — it's just to protect both of us. Please type CONFIRM or click the button.",
        [{ label: "CONFIRM ✓", value: "CONFIRM" }],
        "confirm",
        "rightsConfirmed"
      );
    }
  };

  // Phase 7: Targeting Preferences
  const startPhase7 = async () => {
    await typeMessage(
      "Final stretch! Let's talk about your label preferences.\n\nAre there any specific labels you'd love to work with? (or type 'no preference' if you're open)",
      undefined,
      "text",
      "preferredLabels"
    );
  };

  const handlePhase7Response = async (value: string) => {
    const questions = [
      { field: "preferredLabels", next: "What type of label appeals to you most?", type: "select", options: ["Boutique Labels (small, specialized)", "Established Independents (mid-size)", "Major Labels (big reach)", "No Preference (open to all)"] },
      { field: "labelPreference", next: "How often do you plan to release music each year?", type: "select", options: ["1-2 releases (quality focus)", "3-5 releases (steady)", "6-10 releases (prolific)", "10+ releases (very active)"] },
      { field: "releaseFrequency", next: null },
    ];

    const q = questions[currentQuestion];
    setData(prev => ({ ...prev, [q.field]: value }));

    setCurrentQuestion(prev => prev + 1);

    if (currentQuestion < questions.length - 1) {
      const nextQ = questions[currentQuestion + 1];
      await typeMessage(
        nextQ.next!,
        nextQ.options?.map(o => ({ label: o, value: o })),
        "select",
        nextQ.field
      );
    } else {
      setCurrentPhase(8);
      setCurrentQuestion(0);
      await generateSummary();
    }
  };

  // Phase 8: Summary & Completion
  const generateSummary = async () => {
    await typeMessage(`Amazing work, ${data.artistName}! 🎉\n\nI've got everything I need. Let me put together your representation assessment...`);
    
    await new Promise(r => setTimeout(r, 2500));

    // Generate assessment
    const catalogStrength = parseInt(data.releasedTracks) > 10 ? "Strong" : parseInt(data.releasedTracks) > 3 ? "Solid" : "Growing";
    const hasLinks = data.spotifyLink || data.appleMusicLink || data.beatportLink;
    const marketReadiness = data.professionalMaterial && hasLinks ? "High" : data.professionalMaterial ? "Moderate" : "Building";
    const tierRecommendation = marketReadiness === "High" ? "Tier II or III" : "Tier I";

    const summary = `Here's what I've put together for you:

━━━━━━━━━━━━━━━━━━━━━━━━━
📋 REPRESENTATION ASSESSMENT
━━━━━━━━━━━━━━━━━━━━━━━━━

🎤 Artist: ${data.artistName}
🎵 Genre: ${data.primaryGenre}${data.secondaryGenres.length > 0 ? ` + ${data.secondaryGenres.join(", ")}` : ""}
📍 Based in: ${data.location}

📊 Catalog Strength: ${catalogStrength} (${data.releasedTracks} tracks)
🌐 Platform Presence: ${hasLinks ? "Established ✓" : "Building"}
🚀 Campaign Readiness: ${marketReadiness}
🎯 Target Markets: ${data.targetMarkets.join(", ") || "Global"}

💡 Recommended Tier: ${tierRecommendation}

━━━━━━━━━━━━━━━━━━━━━━━━━

What's next? I'll generate your professional EPK and set up your campaign configuration.\n\nShall we proceed?`;

    await typeMessage(
      summary,
      [
        { label: "Let's do it! →", value: "PROCEED" },
        { label: "Wait, let me review my info", value: "REVIEW" },
      ],
      "select"
    );
  };

  const handlePhase8Response = async (value: string) => {
    if (value === "PROCEED") {
      await completeOnboarding();
    } else if (value === "REVIEW") {
      await typeMessage(
        `Here's a quick summary of what you told me:\n\n` +
        `📝 Legal Name: ${data.legalName}\n` +
        `🎤 Artist Name: ${data.artistName}\n` +
        `📍 Location: ${data.location}\n` +
        `🎵 Genre: ${data.primaryGenre}\n` +
        `🎧 Your Sound: "${data.soundDescription.slice(0, 80)}..."\n` +
        `🎯 2-Year Goal: "${data.careerObjective.slice(0, 80)}..."\n\n` +
        `Everything look good?`,
        [
          { label: "Looks perfect! Let's go →", value: "PROCEED" },
        ],
        "select"
      );
    }
  };

  const completeOnboarding = async () => {
    if (!user) return;

    await typeMessage(`Setting up your profile now, ${data.artistName}... ✨`);

    try {
      // Generate bio from collected data
      const generatedBio = `${data.artistName} is a ${data.yearsActive}-year veteran in the ${data.primaryGenre} scene, based in ${data.location}. ${data.soundDescription} With influences from ${data.artistInfluences.join(", ")}, ${data.artistName} brings a unique perspective to the genre. ${data.uniqueValue}`;

      await setDoc(
        doc(db, "users", user.uid),
        {
          // Core profile
          legalName: data.legalName,
          artistName: data.artistName,
          displayName: data.artistName,
          email: data.email || user.email,
          phone: data.phone || null,
          location: data.location,
          yearsActive: data.yearsActive,
          
          // Genres
          genre: data.primaryGenre,
          genres: [data.primaryGenre, ...data.secondaryGenres],
          
          // Sound profile
          soundDescription: data.soundDescription,
          artistInfluences: data.artistInfluences,
          releasingIndependently: data.releasingIndependently,
          previousLabel: data.previousLabel,
          exclusiveContract: data.exclusiveContract,
          
          // Catalog
          releasedTracks: data.releasedTracks,
          upcomingReleases: data.upcomingReleases,
          professionalMaterial: data.professionalMaterial,
          
          // Links
          links: {
            spotify: data.spotifyLink || null,
            appleMusic: data.appleMusicLink || null,
            beatport: data.beatportLink || null,
          },
          
          // Branding
          uniqueValue: data.uniqueValue,
          idealListener: data.idealListener,
          targetMarkets: data.targetMarkets,
          careerObjective: data.careerObjective,
          
          // Compliance
          rightsConfirmed: data.rightsConfirmed,
          rightsConfirmedAt: serverTimestamp(),
          
          // Targeting
          preferredLabels: data.preferredLabels,
          labelPreference: data.labelPreference,
          releaseFrequency: data.releaseFrequency,
          
          // Generated content
          bio: generatedBio.slice(0, 900),
          
          // Status
          onboardingCompleted: true,
          onboardingCompletedAt: serverTimestamp(),
          onboardingMethod: "conversational",
          epkReady: true,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      trackEvent("onboarding_completed", user.uid, { method: "conversational" });

      await typeMessage(
        `🎉 You're all set, ${data.artistName}!\n\nYour representation profile is now active. I'll be working behind the scenes to match you with the right opportunities.\n\nHeading to your dashboard now — this is where the magic happens!`
      );

      await new Promise(r => setTimeout(r, 2500));
      router.push("/dashboard");
    } catch (error) {
      console.error("Failed to save profile:", error);
      await typeMessage("Oops! Something went wrong on my end. Let me try that again — just click 'Let's do it' one more time.");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    handleUserResponse(input.trim());
    setInput("");
  };

  const handleOptionClick = (value: string) => {
    const lastMessage = messages[messages.length - 1];
    
    if (lastMessage?.inputType === "multiselect") {
      if (selectedOptions.includes(value)) {
        setSelectedOptions(prev => prev.filter(v => v !== value));
      } else {
        setSelectedOptions(prev => [...prev, value]);
      }
    } else {
      handleUserResponse(value);
    }
  };

  const handleMultiselectConfirm = () => {
    if (selectedOptions.length > 0) {
      addMessage({ role: "user", content: selectedOptions.join(", ") });
      processResponse(selectedOptions.join(", "));
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0f1a]">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  const lastMessage = messages[messages.length - 1];
  const showOptions = lastMessage?.options && lastMessage.role === "representative";
  const isMultiselect = lastMessage?.inputType === "multiselect";

  return (
    <div className="min-h-screen bg-[#0a0f1a] flex flex-col">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="h-11 w-11 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 p-0.5">
                  <img 
                    src={REPRESENTATIVE.avatar}
                    alt={REPRESENTATIVE.name}
                    className="h-full w-full rounded-full object-cover bg-[#0a0f1a]"
                  />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-[#0a0f1a]" />
              </div>
              <div>
                <h1 className="text-white font-semibold">{REPRESENTATIVE.name}</h1>
                <p className="text-xs text-slate-400">{REPRESENTATIVE.title} • Verified Sound</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Phase {currentPhase}/8</span>
              <div className="flex gap-1">
                {PHASES.map(phase => (
                  <div
                    key={phase.id}
                    className={`h-1.5 w-6 rounded-full transition-colors ${
                      phase.id < currentPhase
                        ? "bg-emerald-500"
                        : phase.id === currentPhase
                        ? "bg-emerald-400/50"
                        : "bg-white/10"
                    }`}
                    title={phase.name}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "representative" && (
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 p-0.5 shrink-0 mr-3 mt-1">
                  <img 
                    src={REPRESENTATIVE.avatar}
                    alt={REPRESENTATIVE.name}
                    className="h-full w-full rounded-full object-cover bg-[#0a0f1a]"
                  />
                </div>
              )}
              <div
                className={`max-w-[75%] rounded-2xl px-5 py-4 ${
                  msg.role === "user"
                    ? "bg-emerald-600/20 border border-emerald-500/30 text-white"
                    : "bg-white/5 border border-white/10 text-slate-200"
                }`}
              >
                <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <div className="flex justify-start">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 p-0.5 shrink-0">
                  <img 
                    src={REPRESENTATIVE.avatar}
                    alt={REPRESENTATIVE.name}
                    className="h-full w-full rounded-full object-cover bg-[#0a0f1a]"
                  />
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">{REPRESENTATIVE.name} is typing</span>
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" />
                      <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                      <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Options */}
          {showOptions && !isTyping && (
            <div className="flex flex-wrap gap-2 pl-4">
              {lastMessage.options?.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => handleOptionClick(opt.value)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    isMultiselect && selectedOptions.includes(opt.value)
                      ? "bg-emerald-600 text-white border border-emerald-500"
                      : "bg-white/10 text-white border border-white/20 hover:bg-white/20"
                  }`}
                >
                  {isMultiselect && selectedOptions.includes(opt.value) && "✓ "}
                  {opt.label}
                </button>
              ))}
              {isMultiselect && selectedOptions.length > 0 && (
                <button
                  onClick={handleMultiselectConfirm}
                  className="px-4 py-2 rounded-full text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-500 transition-colors"
                >
                  Continue →
                </button>
              )}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input */}
      {!showOptions && !isTyping && lastMessage?.inputType && (
        <footer className="border-t border-white/10 bg-black/20 backdrop-blur-xl sticky bottom-0">
          <form onSubmit={handleSubmit} className="max-w-3xl mx-auto px-4 py-4">
            <div className="flex gap-3">
              {lastMessage.inputType === "textarea" ? (
                <textarea
                  ref={inputRef as any}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your response..."
                  rows={3}
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 focus:border-emerald-500/50 focus:outline-none resize-none"
                  autoFocus
                />
              ) : (
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your response..."
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 focus:border-emerald-500/50 focus:outline-none"
                  autoFocus
                />
              )}
              <button
                type="submit"
                disabled={!input.trim()}
                className="px-6 py-3 rounded-xl bg-emerald-600 text-white font-medium disabled:opacity-50 hover:bg-emerald-500 transition-colors"
              >
                Send
              </button>
            </div>
          </form>
        </footer>
      )}
    </div>
  );
}
