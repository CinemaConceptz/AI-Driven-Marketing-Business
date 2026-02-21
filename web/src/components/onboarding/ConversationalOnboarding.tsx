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

// ===========================================
// REPRESENTATIVE CONFIGURATION
// Change these values to customize your rep
// ===========================================
const REPRESENTATIVE_CONFIG = {
  name: "Maya",                    // Change this to any name
  title: "A&R Representative",     // Their title/role
  company: "Verified Sound",       // Company name
  // Custom avatar image
  avatar: "/maya-avatar.png",
};

// Get initials from name for fallback avatar
const getInitials = (name: string) => {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
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
  "House", "Deep House", "Tech House", "Progressive House", "Afro House",
  "EDM", "Electro", "Future Bass", "Trap", "Bass House",
  "Techno", "Melodic Techno", "Minimal Techno", "Industrial Techno",
  "Trance", "Progressive Trance", "Psytrance", "Uplifting Trance",
  "Drum & Bass", "Jungle", "Liquid DnB",
  "Dubstep", "Riddim", "Brostep",
  "Disco", "Nu-Disco", "Funk",
  "Afrobeats", "Amapiano",
  "Soulful House", "Gospel House",
  "Ambient", "Downtempo", "Chillout",
  "Breakbeat", "UK Garage", "2-Step",
  "Hardstyle", "Hardcore",
  "Lo-Fi", "Synthwave", "Retrowave",
  "Hip-Hop", "R&B", "Soul",
  "Pop", "Indie", "Alternative",
  "Experimental", "IDM",
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
  const [showAvatar, setShowAvatar] = useState(true); // Toggle avatar mode
  const [isListening, setIsListening] = useState(false); // Speech recognition state
  const [isProcessingAudio, setIsProcessingAudio] = useState(false); // Processing state
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Start voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
        
        // Process the audio
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        await processAudioWithGoogleAPI(audioBlob);
      };

      mediaRecorder.start();
      setIsListening(true);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      alert("Could not access microphone. Please check permissions.");
    }
  };

  // Stop voice recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
      setIsListening(false);
    }
  };

  // Process audio with Google Cloud Speech-to-Text API
  const processAudioWithGoogleAPI = async (audioBlob: Blob) => {
    setIsProcessingAudio(true);
    
    try {
      const formData = new FormData();
      formData.append("audio", audioBlob);

      const response = await fetch("/api/speech-to-text", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.success && data.transcription) {
        setInput(prev => prev + (prev ? " " : "") + data.transcription);
      } else if (data.error) {
        console.error("Speech-to-text error:", data.error);
        // Fallback message
        if (data.transcription === "") {
          alert("Could not understand audio. Please try again or type your response.");
        }
      }
    } catch (error) {
      console.error("Error processing audio:", error);
      alert("Error processing audio. Please try again.");
    } finally {
      setIsProcessingAudio(false);
    }
  };

  const toggleVoiceInput = () => {
    if (isListening) {
      stopRecording();
    } else {
      startRecording();
    }
  };

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
    // Phase 1: Welcome - Rep introduces themselves
    await typeMessage(
      `Hi, I'm ${REPRESENTATIVE_CONFIG.name}! I'm your ${REPRESENTATIVE_CONFIG.title} here at ${REPRESENTATIVE_CONFIG.company}.\n\nI'll be guiding you through our structured representation onboarding process. This allows us to evaluate your positioning, prepare your professional profile, and determine strategic label compatibility.\n\nI'm excited to learn more about you and your music. Let's get started!`
    );
    
    await new Promise(r => setTimeout(r, 1000));
    
    await typeMessage(
      "To properly structure your representation profile, I'll ask you a series of questions across a few key areas. Please answer each one accurately — the more I know, the better I can position you for success.",
      [{ label: `I'm ready, ${REPRESENTATIVE_CONFIG.name}!`, value: "ready" }],
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
      { field: "yearsActive", next: "Now let's talk about your sound. What's your primary genre?", nextType: "select", nextOptions: GENRES },
      { field: "primaryGenre", next: "Excellent choice! Do any secondary genres also apply to your sound? Select all that apply, or click 'Continue' if none apply.", nextType: "multiselect", nextOptions: [...GENRES, "None / Just my primary genre"] },
      { field: "secondaryGenres", next: null },
    ];

    const q = questions[currentQuestion];
    
    // Save the value
    if (q.field === "secondaryGenres") {
      // Filter out the "None / Just my primary genre" option and save
      const filteredOptions = selectedOptions.filter(opt => opt !== "None / Just my primary genre");
      setData(prev => ({ ...prev, [q.field]: filteredOptions }));
      setSelectedOptions([]);
    } else {
      setData(prev => ({ ...prev, [q.field]: value }));
    }

    setCurrentQuestion(prev => prev + 1);

    // Check if there's a next prompt to show (q.next contains the text for the NEXT question)
    if (q.next) {
      // Use current question's nextType and nextOptions to determine how to show the next prompt
      if (q.nextType === "select") {
        await typeMessage(
          q.next,
          q.nextOptions?.map(o => ({ label: o, value: o })),
          "select",
          questions[currentQuestion + 1]?.field
        );
      } else if (q.nextType === "multiselect") {
        await typeMessage(
          q.next,
          q.nextOptions?.map(o => ({ label: o, value: o })),
          "multiselect",
          questions[currentQuestion + 1]?.field
        );
      } else {
        await typeMessage(q.next, undefined, "text", questions[currentQuestion + 1]?.field);
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
    const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
    
    if (lastMessage?.inputType === "multiselect") {
      // If "None / Just my primary genre" is selected, auto-continue with no secondary genres
      if (value === "None / Just my primary genre") {
        addMessage({ role: "user", content: "None - just my primary genre" });
        setSelectedOptions([]);
        processResponse(value);
        return;
      }
      
      // If selecting a genre, remove "None" from selection
      if (selectedOptions.includes(value)) {
        setSelectedOptions(prev => prev.filter(v => v !== value));
      } else {
        setSelectedOptions(prev => [...prev.filter(v => v !== "None / Just my primary genre"), value]);
      }
    } else {
      handleUserResponse(value);
    }
  };

  const handleMultiselectConfirm = () => {
    if (selectedOptions && selectedOptions.length > 0) {
      const displayOptions = selectedOptions.filter(opt => opt !== "None / Just my primary genre");
      addMessage({ role: "user", content: displayOptions.length > 0 ? displayOptions.join(", ") : "None" });
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

  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
  const showOptions = lastMessage?.options && lastMessage?.role === "representative";
  const isMultiselect = lastMessage?.inputType === "multiselect";

  return (
    <div className="min-h-screen bg-[#0a0f1a] flex flex-col">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {showAvatar ? (
                <div className="relative">
                  <div className="h-11 w-11 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 p-0.5">
                    {REPRESENTATIVE_CONFIG.avatar ? (
                      <img 
                        src={REPRESENTATIVE_CONFIG.avatar}
                        alt={REPRESENTATIVE_CONFIG.name}
                        className="h-full w-full rounded-full object-cover bg-[#0a0f1a]"
                      />
                    ) : (
                      <div className="h-full w-full rounded-full bg-[#0a0f1a] flex items-center justify-center text-white font-bold text-sm">
                        {getInitials(REPRESENTATIVE_CONFIG.name)}
                      </div>
                    )}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-[#0a0f1a]" />
                </div>
              ) : (
                <div className="h-11 w-11 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                  <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
              )}
              <div>
                <h1 className="text-white font-semibold">{REPRESENTATIVE_CONFIG.name}</h1>
                <p className="text-xs text-slate-400">{REPRESENTATIVE_CONFIG.title} • {REPRESENTATIVE_CONFIG.company}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {/* Avatar Toggle */}
              <button
                onClick={() => setShowAvatar(!showAvatar)}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
                title={showAvatar ? "Switch to text mode" : "Switch to avatar mode"}
              >
                {showAvatar ? (
                  <>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="hidden sm:inline">Avatar</span>
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <span className="hidden sm:inline">Text</span>
                  </>
                )}
              </button>
              
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
              {msg.role === "representative" && showAvatar && (
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 p-0.5 shrink-0 mr-3 mt-1">
                  {REPRESENTATIVE_CONFIG.avatar ? (
                    <img 
                      src={REPRESENTATIVE_CONFIG.avatar}
                      alt={REPRESENTATIVE_CONFIG.name}
                      className="h-full w-full rounded-full object-cover bg-[#0a0f1a]"
                    />
                  ) : (
                    <div className="h-full w-full rounded-full bg-[#0a0f1a] flex items-center justify-center text-white font-bold text-[10px]">
                      {getInitials(REPRESENTATIVE_CONFIG.name)}
                    </div>
                  )}
                </div>
              )}
              <div
                className={`max-w-[75%] rounded-2xl px-5 py-4 ${
                  msg.role === "user"
                    ? "bg-emerald-600/20 border border-emerald-500/30 text-white"
                    : "bg-white/5 border border-white/10 text-slate-200"
                }`}
              >
                {msg.role === "representative" && !showAvatar && (
                  <p className="text-xs text-emerald-400 font-medium mb-1">{REPRESENTATIVE_CONFIG.name}</p>
                )}
                <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <div className="flex justify-start">
              <div className="flex items-center gap-3">
                {showAvatar && (
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 p-0.5 shrink-0">
                    {REPRESENTATIVE_CONFIG.avatar ? (
                      <img 
                        src={REPRESENTATIVE_CONFIG.avatar}
                        alt={REPRESENTATIVE_CONFIG.name}
                        className="h-full w-full rounded-full object-cover bg-[#0a0f1a]"
                      />
                    ) : (
                      <div className="h-full w-full rounded-full bg-[#0a0f1a] flex items-center justify-center text-white font-bold text-[10px]">
                        {getInitials(REPRESENTATIVE_CONFIG.name)}
                      </div>
                    )}
                  </div>
                )}
                <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">{REPRESENTATIVE_CONFIG.name} is typing</span>
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
                <div className="flex-1 relative">
                  <textarea
                    ref={inputRef as any}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type your response..."
                    rows={3}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 pr-12 text-white placeholder-slate-500 focus:border-emerald-500/50 focus:outline-none resize-none"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={toggleVoiceInput}
                    disabled={isProcessingAudio}
                    className={`absolute right-3 top-3 p-2 rounded-full transition-colors ${
                      isProcessingAudio
                        ? "bg-yellow-500/20 text-yellow-400"
                        : isListening 
                          ? "bg-red-500/20 text-red-400 animate-pulse" 
                          : "bg-white/10 text-slate-400 hover:text-white hover:bg-white/20"
                    }`}
                    title={isProcessingAudio ? "Processing..." : isListening ? "Stop recording" : "Voice input (Google AI)"}
                  >
                    {isProcessingAudio ? (
                      <svg className="h-5 w-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                    )}
                  </button>
                </div>
              ) : (
                <div className="flex-1 relative">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type your response..."
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 pr-12 text-white placeholder-slate-500 focus:border-emerald-500/50 focus:outline-none"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={toggleVoiceInput}
                    disabled={isProcessingAudio}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full transition-colors ${
                      isProcessingAudio
                        ? "bg-yellow-500/20 text-yellow-400"
                        : isListening 
                          ? "bg-red-500/20 text-red-400 animate-pulse" 
                          : "bg-white/10 text-slate-400 hover:text-white hover:bg-white/20"
                    }`}
                    title={isProcessingAudio ? "Processing..." : isListening ? "Stop recording" : "Voice input (Google AI)"}
                  >
                    {isProcessingAudio ? (
                      <svg className="h-5 w-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                    )}
                  </button>
                </div>
              )}
              <button
                type="submit"
                disabled={!input.trim()}
                className="px-6 py-3 rounded-xl bg-emerald-600 text-white font-medium disabled:opacity-50 hover:bg-emerald-500 transition-colors"
              >
                Send
              </button>
            </div>
            {isListening && (
              <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                Recording... click mic again to stop
              </p>
            )}
            {isProcessingAudio && (
              <p className="text-xs text-yellow-400 mt-2 flex items-center gap-1">
                <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                Processing with Google AI...
              </p>
            )}
          </form>
        </footer>
      )}
    </div>
  );
}
