import { supabase } from "./supabase";
import { useState, useEffect, useRef, useCallback } from "react";

// ── Pixel font via Google Fonts ──────────────────────────────────────────────
const FONT_LINK = document.createElement("link");
FONT_LINK.rel = "stylesheet";
FONT_LINK.href = "https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323:wght@400&family=Outfit:wght@400;500;600;700&display=swap";
document.head.appendChild(FONT_LINK);

// ── Constants ────────────────────────────────────────────────────────────────
const XP = { Easy: 10, Medium: 20, Hard: 30 };
const PERFECT_BONUS = 50;
const STREAK_BONUS = 15;

const LEVELS = [
  { min: 0, title: "Beginner Adventurer", color: "#6ee7b7" },
  { min: 100, title: "Quest Seeker", color: "#93c5fd" },
  { min: 250, title: "Task Hunter", color: "#c4b5fd" },
  { min: 500, title: "Quest Warrior", color: "#fbbf24" },
  { min: 900, title: "Productivity Knight", color: "#f87171" },
  { min: 1500, title: "Grand Champion", color: "#f472b6" },
  { min: 2500, title: "Legendary Hero", color: "#fb923c" },
];

const ACHIEVEMENTS = [
  { id: "first", label: "First Quest", desc: "Complete your first task", icon: "⚔️", check: (s) => s.totalTasks >= 1 },
  { id: "streak7", label: "7-Day Streak", desc: "Log in 7 days in a row", icon: "🔥", check: (s) => s.streak >= 7 },
  { id: "perfect", label: "Perfect Day", desc: "Complete all 5 tasks", icon: "🏆", check: (s) => s.perfectDays >= 1 },
  { id: "tasks10", label: "10 Quests", desc: "Complete 10 tasks total", icon: "📜", check: (s) => s.totalTasks >= 10 },
  { id: "tasks50", label: "50 Quests", desc: "Complete 50 tasks total", icon: "💎", check: (s) => s.totalTasks >= 50 },
  { id: "level5", label: "Level 5", desc: "Reach Quest Warrior rank", icon: "🗡️", check: (s) => s.totalXP >= 500 },
  { id: "early", label: "Early Bird", desc: "Set tasks before 8am", icon: "🌅", check: (s) => s.earlyBird },
  { id: "social", label: "Party Member", desc: "Post to the feed", icon: "🧑‍🤝‍🧑", check: (s) => s.feedPosts >= 1 },
];

const DEMO_FRIENDS = [];

const FEED_SEED = [];

function getLevel(xp) {
  let lvl = { level: 1, ...LEVELS[0] };
  for (let i = 0; i < LEVELS.length; i++) {
    if (xp >= LEVELS[i].min) lvl = { level: i + 1, ...LEVELS[i] };
    else break;
  }
  const next = LEVELS[lvl.level] || null;
  const progress = next ? Math.round(((xp - lvl.min) / (next.min - lvl.min)) * 100) : 100;
  return { ...lvl, nextXP: next?.min || null, progress };
}

function Particle({ x, y, color, onDone }) {
  const ref = useRef();
  useEffect(() => {
    const t = setTimeout(onDone, 1000);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div ref={ref} style={{
      position: "fixed", left: x, top: y, width: 8, height: 8,
      background: color, borderRadius: 2,
      animation: "particleFly 1s ease-out forwards",
      pointerEvents: "none", zIndex: 9999,
    }} />
  );
}

function PixelAvatar({ color = "#8b5cf6", size = 40, username = "?" }) {
  const initials = username.slice(0, 2).toUpperCase();
  return (
    <div style={{
      width: size, height: size, background: color,
      display: "flex", alignItems: "center", justifyContent: "center",
      border: "3px solid rgba(255,255,255,0.3)",
      imageRendering: "pixelated",
      flexShrink: 0,
      fontSize: size * 0.28,
      fontFamily: "'Press Start 2P', monospace",
      color: "#fff",
      boxShadow: `3px 3px 0 rgba(0,0,0,0.4)`,
    }}>
      {initials}
    </div>
  );
}

function XPBar({ progress, color = "#fbbf24", height = 12 }) {
  return (
    <div style={{ width: "100%", height, background: "rgba(0,0,0,0.4)", border: "2px solid rgba(255,255,255,0.15)", position: "relative", overflow: "hidden" }}>
      <div style={{
        width: `${progress}%`, height: "100%",
        background: `linear-gradient(90deg, ${color}, ${color}dd)`,
        transition: "width 0.5s cubic-bezier(0.34,1.56,0.64,1)",
        boxShadow: `0 0 8px ${color}80`,
        position: "relative",
      }}>
        <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 4, background: "rgba(255,255,255,0.5)" }} />
      </div>
    </div>
  );
}

function TaskCard({ task, index, onToggle, onEdit, isEditing }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ ...task });

  const diffColor = { Easy: "#10b981", Medium: "#f59e0b", Hard: "#ef4444" };
  const diffGlow = { Easy: "#10b98140", Medium: "#f59e0b40", Hard: "#ef444440" };

  function save() {
    onEdit(draft);
    setEditing(false);
  }

  if (editing) {
    return (
      <div style={{ background: "rgba(255,255,255,0.05)", border: "2px solid #fbbf24", padding: "12px 14px", marginBottom: 8 }}>
        <input value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })}
          style={{ width: "100%", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", padding: "6px 8px", fontFamily: "'Outfit', sans-serif", marginBottom: 6, boxSizing: "border-box" }} />
        <textarea value={draft.desc} onChange={e => setDraft({ ...draft, desc: e.target.value })}
          placeholder="Description (optional)" rows={2}
          style={{ width: "100%", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", padding: "6px 8px", fontFamily: "'Outfit', sans-serif", marginBottom: 6, resize: "none", boxSizing: "border-box" }} />
        <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
          {["Easy", "Medium", "Hard"].map(d => (
            <button key={d} onClick={() => setDraft({ ...draft, difficulty: d })} style={{
              flex: 1, padding: "4px 0", background: draft.difficulty === d ? diffColor[d] : "transparent",
              border: `2px solid ${diffColor[d]}`, color: draft.difficulty === d ? "#000" : diffColor[d],
              fontFamily: "'Outfit', sans-serif", fontSize: 12, cursor: "pointer",
            }}>{d} (+{XP[d]}XP)</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={save} style={{ flex: 1, background: "#fbbf24", border: "none", color: "#000", padding: "6px", fontFamily: "'Press Start 2P'", fontSize: 8, cursor: "pointer" }}>SAVE</button>
          <button onClick={() => setEditing(false)} style={{ flex: 1, background: "transparent", border: "2px solid rgba(255,255,255,0.3)", color: "#fff", padding: "6px", fontFamily: "'Press Start 2P'", fontSize: 8, cursor: "pointer" }}>CANCEL</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", marginBottom: 8,
      background: task.done ? "rgba(16,185,129,0.1)" : "rgba(255,255,255,0.04)",
      border: `2px solid ${task.done ? "#10b98150" : "rgba(255,255,255,0.08)"}`,
      transition: "all 0.2s", opacity: task.done ? 0.7 : 1,
      boxShadow: task.done ? "0 0 12px #10b98120" : "none",
    }}>
      <button onClick={() => onToggle(index)} style={{
        width: 22, height: 22, flexShrink: 0, marginTop: 2,
        background: task.done ? "#10b981" : "transparent",
        border: `3px solid ${task.done ? "#10b981" : "rgba(255,255,255,0.3)"}`,
        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
        color: "#fff", fontSize: 12,
      }}>{task.done ? "✓" : ""}</button>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 500, color: task.done ? "#6ee7b7" : "#f1f5f9", textDecoration: task.done ? "line-through" : "none", fontSize: 14 }}>{task.title}</span>
          <span style={{
            fontSize: 10, padding: "2px 6px", background: diffGlow[task.difficulty],
            border: `1px solid ${diffColor[task.difficulty]}`, color: diffColor[task.difficulty],
            fontFamily: "'Outfit', sans-serif", fontWeight: 600,
          }}>{task.difficulty} • +{XP[task.difficulty]}XP</span>
        </div>
        {task.desc && <p style={{ margin: "3px 0 0", fontSize: 12, color: "rgba(255,255,255,0.5)", fontFamily: "'Outfit', sans-serif" }}>{task.desc}</p>}
      </div>
      {isEditing && !task.done && (
        <button onClick={() => setEditing(true)} style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: 14, padding: "0 4px" }}>✏️</button>
      )}
    </div>
  );
}

function LeaderboardRow({ user, rank, isMe }) {
  const lvl = getLevel(user.totalXP);
  const medals = ["🥇", "🥈", "🥉"];
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
      background: isMe ? "rgba(251,191,36,0.12)" : "rgba(255,255,255,0.03)",
      border: `2px solid ${isMe ? "#fbbf2450" : "rgba(255,255,255,0.06)"}`,
      marginBottom: 6, transition: "all 0.2s",
    }}>
      <span style={{ fontFamily: "'Press Start 2P'", fontSize: 11, width: 28, textAlign: "center", color: rank <= 3 ? "#fbbf24" : "rgba(255,255,255,0.4)" }}>
        {rank <= 3 ? medals[rank - 1] : `#${rank}`}
      </span>
      <PixelAvatar color={user.avatar} size={34} username={user.username} />
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 600, color: isMe ? "#fbbf24" : "#f1f5f9", fontSize: 14 }}>{user.username}</span>
          {isMe && <span style={{ fontSize: 10, color: "#fbbf24", fontFamily: "'Press Start 2P'" }}>YOU</span>}
        </div>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", fontFamily: "'Outfit', sans-serif" }}>{lvl.title}</span>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontFamily: "'Press Start 2P'", fontSize: 11, color: "#fbbf24" }}>{user.totalXP.toLocaleString()}</div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "'Outfit', sans-serif" }}>🔥 {user.streak}d</div>
      </div>
    </div>
  );
}

function FeedPost({ post, onReact }) {
  return (
    <div style={{
      padding: "12px 14px", background: "rgba(255,255,255,0.04)",
      border: "2px solid rgba(255,255,255,0.07)", marginBottom: 10,
    }}>
      <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
        <PixelAvatar color={post.avatar} size={36} username={post.user} />
        <div>
          <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 600, color: "#f1f5f9", fontSize: 14 }}>{post.user}</span>
          <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 11, color: "rgba(255,255,255,0.35)", marginLeft: 8 }}>{post.time}</span>
        </div>
      </div>
      <p style={{ margin: "0 0 10px", fontFamily: "'Outfit', sans-serif", fontSize: 14, color: "rgba(255,255,255,0.8)", lineHeight: 1.5 }}>{post.text}</p>
      <div style={{ display: "flex", gap: 8 }}>
        {["🔥", "⚡", "👏", "🎉", "💪"].map(e => (
          <button key={e} onClick={() => onReact(post.id, e)} style={{
            background: post.emoji === e ? "rgba(251,191,36,0.15)" : "rgba(255,255,255,0.05)",
            border: `1px solid ${post.emoji === e ? "#fbbf2450" : "rgba(255,255,255,0.1)"}`,
            color: "white", cursor: "pointer", padding: "3px 8px", fontSize: 13,
            fontFamily: "'Outfit', sans-serif",
          }}>{e} {post.likes > 0 && post.emoji === e ? post.likes : ""}</button>
        ))}
      </div>
    </div>
  );
}

function AchievementBadge({ ach, unlocked }) {
  return (
    <div style={{
      padding: "10px 12px", background: unlocked ? "rgba(251,191,36,0.1)" : "rgba(255,255,255,0.03)",
      border: `2px solid ${unlocked ? "#fbbf2440" : "rgba(255,255,255,0.06)"}`,
      display: "flex", alignItems: "center", gap: 10, opacity: unlocked ? 1 : 0.4,
      transition: "all 0.3s",
    }}>
      <span style={{ fontSize: 22 }}>{ach.icon}</span>
      <div>
        <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 600, fontSize: 13, color: unlocked ? "#fbbf24" : "rgba(255,255,255,0.5)" }}>{ach.label}</div>
        <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{ach.desc}</div>
      </div>
      {unlocked && <span style={{ marginLeft: "auto", color: "#10b981", fontSize: 16 }}>✓</span>}
    </div>
  );
}

// ── Main App ─────────────────────────────────────────────────────────────────
export default function QuestBoard() {
  // Auth / profile
  const [players, setPlayers] = useState([]);
  useEffect(() => {
  async function loadPlayers() {
    const { data, error } = await supabase
      .from("players")
      .select("*")
      .order("totalXP", { ascending: false });

    if (!error) {
  console.log("Players from Supabase:", data);
  setPlayers(data);
}
  }

  loadPlayers();
}, []);
  const [screen, setScreen] = useState("login"); // login | signup | app
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [signupForm, setSignupForm] = useState({ username: "", password: "", bio: "", avatarColor: "#8b5cf6" });
  const [profile, setProfile] = useState(null);

  // App state
  const [tab, setTab] = useState("dashboard");
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState({
  totalXP: 0,
  streak: 0,
  totalTasks: 0,
  perfectDays: 0,
  earlyBird: false,
  feedPosts: 0,
  weekXP: 0,
});
  const [feed, setFeed] = useState(FEED_SEED);
  const [newPost, setNewPost] = useState("");
  const [lbTab, setLbTab] = useState("weekly");
  const [particles, setParticles] = useState([]);
  const [toast, setToast] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [newTask, setNewTask] = useState({ title: "", difficulty: "Medium", desc: "" });
  const [addingTask, setAddingTask] = useState(false);
  const [prevAchs, setPrevAchs] = useState(new Set());
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [showAiPanel, setShowAiPanel] = useState(false);

  const particleId = useRef(0);

  const todayXP = tasks.filter(t => t.done).reduce((s, t) => s + XP[t.difficulty], 0);
  const doneCount = tasks.filter(t => t.done).length;
  const totalXP = stats.totalXP + todayXP;
  const lvl = getLevel(totalXP);
  const unlockedAchs = new Set(ACHIEVEMENTS.filter(a => a.check({ ...stats, totalXP })).map(a => a.id));

  // Check new achievements
  useEffect(() => {
    unlockedAchs.forEach(id => {
      if (!prevAchs.has(id)) {
        const ach = ACHIEVEMENTS.find(a => a.id === id);
        if (ach) showToast(`🏆 Achievement: ${ach.label}!`, "#fbbf24");
      }
    });
    setPrevAchs(unlockedAchs);
  }, [totalXP, stats]);

  useEffect(() => {
  loadPlayers();
}, []);

async function loadPlayers() {
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .order("totalXP", { ascending: false });

  if (!error) {
    setPlayers(data);
  }
}

  function spawnParticles(x, y) {
    const colors = ["#fbbf24", "#10b981", "#f472b6", "#60a5fa", "#a78bfa"];
    const newParticles = Array.from({ length: 12 }, (_, i) => ({
      id: particleId.current++,
      x: x + Math.random() * 60 - 30,
      y: y + Math.random() * 40 - 20,
      color: colors[i % colors.length],
    }));
    setParticles(p => [...p, ...newParticles]);
  }

  function showToast(msg, color = "#10b981") {
    setToast({ msg, color });
    setTimeout(() => setToast(null), 3000);
  }

  function handleToggle(idx, e) {
    const updated = [...tasks];
    updated[idx] = { ...updated[idx], done: !updated[idx].done };
    setTasks(updated);
    if (!updated[idx].done) return;
    const xpEarned = XP[updated[idx].difficulty];
    showToast(`+${xpEarned} XP earned!`, "#10b981");
    if (e) spawnParticles(e.clientX, e.clientY);
    const newDone = updated.filter(t => t.done).length;
    if (newDone === 5) {
      setTimeout(() => showToast(`🎉 PERFECT DAY! +${PERFECT_BONUS} BONUS XP!`, "#fbbf24"), 800);
    }
  }

  function handleEditTask(idx, updated) {
    const t = [...tasks];
    t[idx] = { ...t[idx], ...updated };
    setTasks(t);
  }

  function handleAddTask() {
    if (!newTask.title.trim() || tasks.length >= 5) return;
    setTasks([...tasks, { ...newTask, done: false }]);
    setNewTask({ title: "", difficulty: "Medium", desc: "" });
    setAddingTask(false);
  }

  function handleReact(postId, emoji) {
    setFeed(f => f.map(p => p.id === postId ? { ...p, emoji, likes: p.likes + 1 } : p));
  }

  function handlePostFeed() {
    if (!newPost.trim()) return;
    const post = {
      id: `fp${Date.now()}`, user: profile?.username || "You",
      avatar: profile?.avatarColor || "#8b5cf6",
      text: newPost, time: "just now", emoji: "🔥", likes: 0,
    };
    setFeed([post, ...feed]);
    setNewPost("");
    setStats(s => ({ ...s, feedPosts: s.feedPosts + 1 }));
    showToast("Posted to the quest feed! 📣", "#60a5fa");
  }

  async function getAISuggestions() {
    setAiLoading(true);
    setShowAiPanel(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: `You are a productivity quest master for a gamified app. Generate 5 daily quest suggestions for someone who wants to improve themselves. 
The user's current level is "${lvl.title}" with ${totalXP} XP.
Current tasks: ${tasks.map(t => t.title).join(", ")}

Return ONLY valid JSON array with objects having: title (string, max 40 chars), difficulty ("Easy"|"Medium"|"Hard"), desc (string, max 60 chars, optional tip).
Example: [{"title":"Morning run","difficulty":"Medium","desc":"Start with 20 minutes"}]
No markdown, no explanation, just the JSON array.`
          }]
        })
      });
      const data = await res.json();
      const text = data.content?.[0]?.text || "[]";
      const clean = text.replace(/```json|```/g, "").trim();
      const suggestions = JSON.parse(clean);
      setAiSuggestions(suggestions.slice(0, 5));
    } catch (err) {
      showToast("Couldn't reach the quest oracle!", "#ef4444");
      setAiSuggestions([
        { title: "Drink 8 glasses of water", difficulty: "Easy", desc: "Stay hydrated all day" },
        { title: "30-min deep work session", difficulty: "Hard", desc: "No distractions allowed" },
        { title: "Walk 5,000 steps", difficulty: "Medium", desc: "Get moving outside" },
        { title: "Learn one new thing", difficulty: "Easy", desc: "Article, video, or podcast" },
        { title: "Write in your journal", difficulty: "Easy", desc: "Reflect on your day" },
      ]);
    }
    setAiLoading(false);
  }

  function adoptSuggestion(task) {
    if (tasks.length >= 5) { showToast("Quest board is full (max 5)!", "#ef4444"); return; }
    setTasks(t => [...t, { ...task, done: false }]);
    showToast(`Quest added: "${task.title}"`, "#10b981");
  }

  function handleLogin() {
    if (!loginForm.username) return showToast("Enter a username!", "#ef4444");
    setProfile({ username: loginForm.username, avatarColor: "#8b5cf6", bio: "On a quest for greatness." });
    setScreen("app");
  }

  async function handleSignup() {
  if (!signupForm.username)
    return showToast("Pick a username!", "#ef4444");

  setProfile({
    username: signupForm.username,
    avatarColor: signupForm.avatarColor,
    bio: signupForm.bio || "On a quest for greatness."
  });

  const { data, error } = await supabase
    .from("players")
    .insert([
      {
        username: signupForm.username,
        avatarcolor: signupForm.avatarColor,
        totalXP: 0,
        streak: 0,
        totalTasks: 0,
        perfectDays: 0,
      },
    ]);

  console.log(data);
  console.log(error);

  setScreen("app");
}

  // Build leaderboard
  const meEntry = { id: "me", username: profile?.username || "You", avatar: profile?.avatarColor || "#8b5cf6", totalXP, streak: stats.streak, weekXP: stats.weekXP + todayXP };
  const allUsers = [...players].sort(
  (a, b) => b.totalXP - a.totalXP);
  const myRank = allUsers.findIndex(u => u.id === "me") + 1;

  // Avatar color options
  const AVATAR_COLORS = ["#8b5cf6", "#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#ec4899", "#06b6d4", "#f97316"];

  // ── CSS ───────────────────────────────────────────────────────────────────
  const globalCSS = `
    @keyframes particleFly { 0%{transform:translateY(0) scale(1);opacity:1} 100%{transform:translateY(-80px) scale(0);opacity:0} }
    @keyframes fadeInUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.6} }
    @keyframes scanline { 0%{transform:translateY(-100%)} 100%{transform:translateY(100%)} }
    @keyframes glowPulse { 0%,100%{box-shadow:0 0 8px #fbbf2440} 50%{box-shadow:0 0 20px #fbbf2480} }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: #0d0d1a; } ::-webkit-scrollbar-thumb { background: #fbbf2460; }
    button:focus { outline: 2px solid #fbbf2480; outline-offset: 2px; }
  `;

  // ── Screens ───────────────────────────────────────────────────────────────
  const BG = {
    minHeight: "100vh", background: "linear-gradient(135deg, #0d0d1a 0%, #0f1a2e 50%, #1a0d2e 100%)",
    position: "relative", overflow: "hidden",
    fontFamily: "'Outfit', sans-serif",
  };
  const GRID_BG = {
    position: "absolute", inset: 0,
    backgroundImage: "linear-gradient(rgba(251,191,36,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(251,191,36,0.03) 1px, transparent 1px)",
    backgroundSize: "32px 32px", pointerEvents: "none",
  };

  // ── Login Screen ──────────────────────────────────────────────────────────
  if (screen === "login" || screen === "signup") {
    return (
      <div style={BG}>
        <style>{globalCSS}</style>
        <div style={GRID_BG} />

        {/* Decorative pixels */}
        {[...Array(8)].map((_, i) => (
          <div key={i} style={{
            position: "absolute", width: 12, height: 12,
            background: ["#fbbf24", "#8b5cf6", "#10b981", "#ef4444", "#60a5fa", "#f472b6", "#fbbf24", "#8b5cf6"][i],
            left: `${[10, 25, 70, 85, 15, 60, 80, 40][i]}%`,
            top: `${[15, 70, 10, 60, 45, 80, 30, 85][i]}%`,
            animation: `pulse ${2 + i * 0.3}s infinite`,
            imageRendering: "pixelated", opacity: 0.6,
          }} />
        ))}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: 20 }}>
          <div style={{
            width: "100%", maxWidth: 420,
            background: "rgba(13,13,26,0.9)",
            border: "3px solid rgba(251,191,36,0.3)",
            padding: "40px 36px",
            animation: "fadeInUp 0.5s ease",
            boxShadow: "0 0 40px rgba(251,191,36,0.1), inset 0 0 40px rgba(0,0,0,0.3)",
          }}>
            {/* Logo */}
            <div style={{ textAlign: "center", marginBottom: 36 }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>⚔️</div>
              <h1 style={{ fontFamily: "'Press Start 2P'", fontSize: 18, color: "#fbbf24", letterSpacing: 2, textShadow: "0 0 20px #fbbf2480", lineHeight: 1.4 }}>QUEST<br />BOARD</h1>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 8, fontFamily: "'VT323'", fontSize: 18, letterSpacing: 1 }}>YOUR DAILY ADVENTURE AWAITS</p>
            </div>

            {/* Tab toggle */}
            <div style={{ display: "flex", marginBottom: 28, border: "2px solid rgba(255,255,255,0.1)" }}>
              {["login", "signup"].map(s => (
                <button key={s} onClick={() => setScreen(s)} style={{
                  flex: 1, padding: "10px", background: screen === s ? "#fbbf24" : "transparent",
                  border: "none", color: screen === s ? "#000" : "rgba(255,255,255,0.5)",
                  fontFamily: "'Press Start 2P'", fontSize: 9, cursor: "pointer",
                  textTransform: "uppercase",
                }}>{s === "login" ? "LOGIN" : "SIGN UP"}</button>
              ))}
            </div>

            {screen === "login" ? (
              <div>
                <label style={{ display: "block", fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 6, fontFamily: "'Press Start 2P'", letterSpacing: 1 }}>USERNAME</label>
                <input value={loginForm.username} onChange={e => setLoginForm({ ...loginForm, username: e.target.value })}
                  placeholder="heroic_adventurer"
                  style={{ width: "100%", background: "rgba(0,0,0,0.5)", border: "2px solid rgba(255,255,255,0.15)", color: "#fff", padding: "10px 12px", fontFamily: "'Outfit', sans-serif", fontSize: 15, marginBottom: 16, outline: "none" }} />
                <label style={{ display: "block", fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 6, fontFamily: "'Press Start 2P'", letterSpacing: 1 }}>PASSWORD</label>
                <input type="password" value={loginForm.password} onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
                  placeholder="••••••••"
                  style={{ width: "100%", background: "rgba(0,0,0,0.5)", border: "2px solid rgba(255,255,255,0.15)", color: "#fff", padding: "10px 12px", fontFamily: "'Outfit', sans-serif", fontSize: 15, marginBottom: 24, outline: "none" }} />
                <button onClick={handleLogin} style={{
                  width: "100%", padding: "14px", background: "#fbbf24", border: "none",
                  fontFamily: "'Press Start 2P'", fontSize: 12, color: "#000", cursor: "pointer",
                  boxShadow: "4px 4px 0 #92400e", transition: "all 0.1s",
                  animation: "glowPulse 2s infinite",
                }}>▶ START QUEST</button>
              </div>
            ) : (
              <div>
                <label style={{ display: "block", fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 6, fontFamily: "'Press Start 2P'", letterSpacing: 1 }}>USERNAME</label>
                <input value={signupForm.username} onChange={e => setSignupForm({ ...signupForm, username: e.target.value })}
                  placeholder="your_epic_name"
                  style={{ width: "100%", background: "rgba(0,0,0,0.5)", border: "2px solid rgba(255,255,255,0.15)", color: "#fff", padding: "10px 12px", fontFamily: "'Outfit', sans-serif", fontSize: 15, marginBottom: 16, outline: "none" }} />
                <label style={{ display: "block", fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 8, fontFamily: "'Press Start 2P'", letterSpacing: 1 }}>AVATAR COLOR</label>
                <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                  {AVATAR_COLORS.map(c => (
                    <button key={c} onClick={() => setSignupForm({ ...signupForm, avatarColor: c })} style={{
                      width: 32, height: 32, background: c, border: signupForm.avatarColor === c ? "3px solid #fff" : "3px solid transparent",
                      cursor: "pointer", flexShrink: 0,
                    }} />
                  ))}
                </div>
                <label style={{ display: "block", fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 6, fontFamily: "'Press Start 2P'", letterSpacing: 1 }}>BIO (optional)</label>
                <input value={signupForm.bio} onChange={e => setSignupForm({ ...signupForm, bio: e.target.value })}
                  placeholder="On a quest for greatness..."
                  style={{ width: "100%", background: "rgba(0,0,0,0.5)", border: "2px solid rgba(255,255,255,0.15)", color: "#fff", padding: "10px 12px", fontFamily: "'Outfit', sans-serif", fontSize: 15, marginBottom: 24, outline: "none" }} />
                <button onClick={handleSignup} style={{
                  width: "100%", padding: "14px", background: "#8b5cf6", border: "none",
                  fontFamily: "'Press Start 2P'", fontSize: 12, color: "#fff", cursor: "pointer",
                  boxShadow: "4px 4px 0 #5b21b6", transition: "all 0.1s",
                }}>⚔️ CREATE HERO</button>
              </div>
            )}

            <p style={{ textAlign: "center", marginTop: 20, fontSize: 12, color: "rgba(255,255,255,0.3)", fontFamily: "'VT323'", fontSize: 16 }}>
              Demo: any username works — just hit the button!
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Main App Layout ───────────────────────────────────────────────────────
  const NAV_TABS = [
    { id: "dashboard", icon: "🏠", label: "Dashboard" },
    { id: "quests", icon: "⚔️", label: "Quests" },
    { id: "leaderboard", icon: "🏆", label: "Board" },
    { id: "feed", icon: "📣", label: "Feed" },
    { id: "profile", icon: "👤", label: "Profile" },
  ];

  return (
    <div style={{ ...BG, paddingBottom: 70 }}>
      <style>{globalCSS}</style>
      <div style={GRID_BG} />

      {/* Particles */}
      {particles.map(p => (
        <Particle key={p.id} x={p.x} y={p.y} color={p.color} onDone={() => setParticles(ps => ps.filter(x => x.id !== p.id))} />
      ))}

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)",
          background: "rgba(0,0,0,0.95)", border: `2px solid ${toast.color}`,
          color: toast.color, padding: "10px 20px", fontFamily: "'Outfit', sans-serif",
          fontWeight: 600, fontSize: 14, zIndex: 10000,
          boxShadow: `0 0 20px ${toast.color}40`, animation: "fadeInUp 0.3s ease",
          whiteSpace: "nowrap",
        }}>{toast.msg}</div>
      )}

      {/* Header */}
      <header style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(13,13,26,0.95)",
        borderBottom: "2px solid rgba(251,191,36,0.2)",
        padding: "12px 20px",
        backdropFilter: "blur(10px)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>⚔️</span>
          <span style={{ fontFamily: "'Press Start 2P'", fontSize: 13, color: "#fbbf24", textShadow: "0 0 12px #fbbf2460" }}>QUESTBOARD</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: "'Press Start 2P'", fontSize: 10, color: "#fbbf24" }}>LVL {lvl.level}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontFamily: "'Outfit', sans-serif" }}>{totalXP.toLocaleString()} XP</div>
          </div>
          <PixelAvatar color={profile?.avatarColor || "#8b5cf6"} size={36} username={profile?.username || "?"} />
        </div>
      </header>

      {/* Content */}
      <div style={{ padding: "20px 16px", maxWidth: 700, margin: "0 auto" }}>

        {/* DASHBOARD ─────────────────────────────────────────── */}
        {tab === "dashboard" && (
          <div style={{ animation: "fadeInUp 0.3s ease" }}>
            {/* Welcome banner */}
            <div style={{
              background: "linear-gradient(135deg, rgba(139,92,246,0.2), rgba(251,191,36,0.1))",
              border: "2px solid rgba(139,92,246,0.3)",
              padding: "16px 20px", marginBottom: 20,
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div>
                <h2 style={{ fontFamily: "'Press Start 2P'", fontSize: 12, color: "#a78bfa", marginBottom: 4 }}>DAILY QUEST</h2>
                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", fontFamily: "'Outfit', sans-serif" }}>Welcome back, <strong style={{ color: "#fbbf24" }}>{profile?.username}</strong>! Ready to grind?</p>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "'Press Start 2P'", fontSize: 18, color: "#f472b6" }}>🔥{stats.streak}</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontFamily: "'Press Start 2P'" }}>STREAK</div>
              </div>
            </div>

            {/* Stat cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10, marginBottom: 20 }}>
              {[
                { label: "TODAY XP", value: `+${todayXP}`, color: "#10b981", icon: "⚡" },
                { label: "TOTAL XP", value: totalXP.toLocaleString(), color: "#fbbf24", icon: "💎" },
                { label: "TASKS TODAY", value: `${doneCount}/5`, color: "#60a5fa", icon: "📋" },
                { label: "YOUR RANK", value: `#${myRank}`, color: "#f472b6", icon: "🏆" },
              ].map(s => (
                <div key={s.label} style={{ background: "rgba(255,255,255,0.04)", border: "2px solid rgba(255,255,255,0.08)", padding: "12px 14px" }}>
                  <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
                  <div style={{ fontFamily: "'Press Start 2P'", fontSize: 13, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontFamily: "'Press Start 2P'", marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Level progress */}
            <div style={{ background: "rgba(255,255,255,0.04)", border: "2px solid rgba(255,255,255,0.08)", padding: "14px 16px", marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <div>
                  <span style={{ fontFamily: "'Press Start 2P'", fontSize: 11, color: lvl.color }}>LV.{lvl.level} {lvl.title}</span>
                </div>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontFamily: "'Outfit', sans-serif" }}>
                  {totalXP}/{lvl.nextXP || "MAX"} XP
                </span>
              </div>
              <XPBar progress={lvl.progress} color={lvl.color} height={14} />
            </div>

            {/* Today's quests preview */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h3 style={{ fontFamily: "'Press Start 2P'", fontSize: 11, color: "#fbbf24" }}>TODAY'S QUESTS</h3>
                <button onClick={() => setTab("quests")} style={{
                  background: "transparent", border: "1px solid #fbbf2440", color: "#fbbf24",
                  fontFamily: "'Press Start 2P'", fontSize: 8, padding: "4px 8px", cursor: "pointer",
                }}>VIEW ALL →</button>
              </div>
              <div style={{ marginBottom: 8 }}>
                <XPBar progress={Math.round((doneCount / 5) * 100)} color="#fbbf24" height={8} />
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "'Outfit', sans-serif" }}>
                  <span>{doneCount} of 5 complete</span>
                  {doneCount === 5 && <span style={{ color: "#10b981" }}>🎉 PERFECT DAY!</span>}
                </div>
              </div>
              {tasks.slice(0, 3).map((t, i) => (
                <div key={i} onClick={(e) => handleToggle(i, e)} style={{
                  display: "flex", gap: 10, padding: "8px 10px", marginBottom: 6, cursor: "pointer",
                  background: t.done ? "rgba(16,185,129,0.08)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${t.done ? "#10b98130" : "rgba(255,255,255,0.06)"}`,
                  opacity: t.done ? 0.6 : 1,
                }}>
                  <span style={{ fontSize: 16 }}>{t.done ? "✅" : "🔲"}</span>
                  <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 13, color: t.done ? "#6ee7b7" : "#f1f5f9", textDecoration: t.done ? "line-through" : "none" }}>{t.title}</span>
                </div>
              ))}
              {tasks.length > 3 && <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", fontFamily: "'Outfit', sans-serif", textAlign: "center", marginTop: 4 }}>+{tasks.length - 3} more quests</p>}
            </div>

            {/* Friends activity */}
            <div>
              <h3 style={{ fontFamily: "'Press Start 2P'", fontSize: 11, color: "#fbbf24", marginBottom: 12 }}>FRIENDS' ACTIVITY</h3>
              {feed.slice(0, 2).map(p => <FeedPost key={p.id} post={p} onReact={handleReact} />)}
              <button onClick={() => setTab("feed")} style={{
                width: "100%", padding: "10px", background: "transparent",
                border: "2px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)",
                fontFamily: "'Press Start 2P'", fontSize: 9, cursor: "pointer", marginTop: 4,
              }}>VIEW FULL FEED →</button>
            </div>
          </div>
        )}

        {/* QUESTS ─────────────────────────────────────────────── */}
        {tab === "quests" && (
          <div style={{ animation: "fadeInUp 0.3s ease" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontFamily: "'Press Start 2P'", fontSize: 13, color: "#fbbf24" }}>DAILY QUESTS</h2>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setEditMode(e => !e)} style={{
                  background: editMode ? "#fbbf24" : "transparent",
                  border: "2px solid #fbbf24", color: editMode ? "#000" : "#fbbf24",
                  fontFamily: "'Press Start 2P'", fontSize: 8, padding: "6px 10px", cursor: "pointer",
                }}>{editMode ? "DONE" : "EDIT"}</button>
                <button onClick={getAISuggestions} style={{
                  background: "rgba(139,92,246,0.2)", border: "2px solid #8b5cf6",
                  color: "#a78bfa", fontFamily: "'Press Start 2P'", fontSize: 8, padding: "6px 10px", cursor: "pointer",
                }}>🔮 AI</button>
              </div>
            </div>

            {/* Progress */}
            <div style={{ background: "rgba(255,255,255,0.04)", border: "2px solid rgba(255,255,255,0.08)", padding: "14px 16px", marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontFamily: "'Press Start 2P'", fontSize: 10, color: "rgba(255,255,255,0.6)" }}>PROGRESS</span>
                <span style={{ fontFamily: "'Press Start 2P'", fontSize: 10, color: "#fbbf24" }}>{doneCount}/5 QUESTS</span>
              </div>
              <XPBar progress={Math.round((doneCount / 5) * 100)} color="#fbbf24" />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 12, color: "rgba(255,255,255,0.4)", fontFamily: "'Outfit', sans-serif" }}>
                <span>XP Today: <strong style={{ color: "#10b981" }}>+{todayXP}</strong></span>
                {doneCount === 5 && <span style={{ color: "#fbbf24", fontFamily: "'Press Start 2P'", fontSize: 9 }}>🎉 PERFECT!</span>}
              </div>
            </div>

            {/* Task list */}
            {tasks.map((task, i) => (
              <div key={i} onClick={(e) => !editMode && handleToggle(i, e)}>
                <TaskCard
                  task={task} index={i}
                  onToggle={(idx) => handleToggle(idx)}
                  onEdit={(upd) => handleEditTask(i, upd)}
                  isEditing={editMode}
                />
              </div>
            ))}

            {/* Add task */}
            {tasks.length < 5 && (
              <div>
                {addingTask ? (
                  <div style={{ background: "rgba(255,255,255,0.04)", border: "2px solid rgba(251,191,36,0.3)", padding: "14px" }}>
                    <input value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                      placeholder="Quest title..."
                      style={{ width: "100%", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", padding: "8px", fontFamily: "'Outfit', sans-serif", marginBottom: 8, boxSizing: "border-box" }} />
                    <input value={newTask.desc} onChange={e => setNewTask({ ...newTask, desc: e.target.value })}
                      placeholder="Description (optional)"
                      style={{ width: "100%", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", padding: "8px", fontFamily: "'Outfit', sans-serif", marginBottom: 8, boxSizing: "border-box" }} />
                    <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                      {["Easy", "Medium", "Hard"].map(d => (
                        <button key={d} onClick={() => setNewTask({ ...newTask, difficulty: d })} style={{
                          flex: 1, padding: "5px", background: newTask.difficulty === d ? { Easy: "#10b981", Medium: "#f59e0b", Hard: "#ef4444" }[d] : "transparent",
                          border: `2px solid ${{ Easy: "#10b981", Medium: "#f59e0b", Hard: "#ef4444" }[d]}`,
                          color: newTask.difficulty === d ? "#000" : { Easy: "#10b981", Medium: "#f59e0b", Hard: "#ef4444" }[d],
                          fontFamily: "'Outfit', sans-serif", fontSize: 12, cursor: "pointer",
                        }}>{d}</button>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={handleAddTask} style={{ flex: 1, background: "#fbbf24", border: "none", color: "#000", padding: "8px", fontFamily: "'Press Start 2P'", fontSize: 8, cursor: "pointer" }}>ADD QUEST</button>
                      <button onClick={() => setAddingTask(false)} style={{ flex: 1, background: "transparent", border: "2px solid rgba(255,255,255,0.2)", color: "#fff", padding: "8px", fontFamily: "'Press Start 2P'", fontSize: 8, cursor: "pointer" }}>CANCEL</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setAddingTask(true)} style={{
                    width: "100%", padding: "12px", background: "transparent",
                    border: "2px dashed rgba(251,191,36,0.3)", color: "rgba(251,191,36,0.6)",
                    fontFamily: "'Press Start 2P'", fontSize: 9, cursor: "pointer", marginTop: 6,
                  }}>+ ADD QUEST ({tasks.length}/5)</button>
                )}
              </div>
            )}

            {/* AI Suggestions Panel */}
            {showAiPanel && (
              <div style={{ marginTop: 20, background: "rgba(139,92,246,0.1)", border: "2px solid rgba(139,92,246,0.3)", padding: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <h3 style={{ fontFamily: "'Press Start 2P'", fontSize: 10, color: "#a78bfa" }}>🔮 AI QUEST ORACLE</h3>
                  <button onClick={() => setShowAiPanel(false)} style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: 16 }}>✕</button>
                </div>
                {aiLoading ? (
                  <div style={{ textAlign: "center", padding: "20px", color: "rgba(255,255,255,0.5)", fontFamily: "'Press Start 2P'", fontSize: 9 }}>
                    <div style={{ animation: "pulse 1s infinite", marginBottom: 8, fontSize: 24 }}>🔮</div>
                    CONSULTING THE ORACLE...
                  </div>
                ) : (
                  <div>
                    {aiSuggestions.map((s, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", marginBottom: 6, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(139,92,246,0.2)" }}>
                        <div style={{ flex: 1 }}>
                          <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 13, color: "#f1f5f9" }}>{s.title}</span>
                          {s.desc && <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", margin: "2px 0 0", fontFamily: "'Outfit', sans-serif" }}>{s.desc}</p>}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 10, color: { Easy: "#10b981", Medium: "#f59e0b", Hard: "#ef4444" }[s.difficulty], fontFamily: "'Outfit', sans-serif", fontWeight: 600 }}>{s.difficulty}</span>
                          <button onClick={() => adoptSuggestion(s)} disabled={tasks.length >= 5} style={{
                            background: "#8b5cf6", border: "none", color: "#fff",
                            fontFamily: "'Press Start 2P'", fontSize: 7, padding: "4px 6px", cursor: "pointer",
                          }}>+ ADD</button>
                        </div>
                      </div>
                    ))}
                    <button onClick={getAISuggestions} style={{
                      width: "100%", marginTop: 8, padding: "8px", background: "transparent",
                      border: "2px solid rgba(139,92,246,0.4)", color: "#a78bfa",
                      fontFamily: "'Press Start 2P'", fontSize: 8, cursor: "pointer",
                    }}>🔄 REGENERATE</button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* LEADERBOARD ─────────────────────────────────────────── */}
        {tab === "leaderboard" && (
          <div style={{ animation: "fadeInUp 0.3s ease" }}>
            <h2 style={{ fontFamily: "'Press Start 2P'", fontSize: 13, color: "#fbbf24", marginBottom: 20, textAlign: "center", textShadow: "0 0 20px #fbbf2460" }}>🏆 HALL OF FAME</h2>

            {/* Tab selector */}
            <div style={{ display: "flex", marginBottom: 20, border: "2px solid rgba(255,255,255,0.1)" }}>
              {["weekly", "alltime"].map(t => (
                <button key={t} onClick={() => setLbTab(t)} style={{
                  flex: 1, padding: "10px", background: lbTab === t ? "#fbbf24" : "transparent",
                  border: "none", color: lbTab === t ? "#000" : "rgba(255,255,255,0.5)",
                  fontFamily: "'Press Start 2P'", fontSize: 8, cursor: "pointer",
                }}>{t === "weekly" ? "THIS WEEK" : "ALL-TIME"}</button>
              ))}
            </div>

            {/* My rank banner */}
            <div style={{
              background: "rgba(251,191,36,0.1)", border: "2px solid #fbbf2440",
              padding: "10px 14px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <span style={{ fontFamily: "'Press Start 2P'", fontSize: 9, color: "rgba(255,255,255,0.5)" }}>YOUR RANK</span>
              <span style={{ fontFamily: "'Press Start 2P'", fontSize: 14, color: "#fbbf24" }}>#{myRank}</span>
            </div>

            {allUsers.map((u, i) => (
              <LeaderboardRow key={u.id} user={u} rank={i + 1} isMe={u.id === "me"} />
            ))}
          </div>
        )}

        {/* FEED ───────────────────────────────────────────────── */}
        {tab === "feed" && (
          <div style={{ animation: "fadeInUp 0.3s ease" }}>
            <h2 style={{ fontFamily: "'Press Start 2P'", fontSize: 13, color: "#fbbf24", marginBottom: 20 }}>📣 QUEST FEED</h2>

            {/* Post composer */}
            <div style={{ background: "rgba(255,255,255,0.04)", border: "2px solid rgba(255,255,255,0.1)", padding: "14px", marginBottom: 20 }}>
              <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                <PixelAvatar color={profile?.avatarColor || "#8b5cf6"} size={36} username={profile?.username || "?"} />
                <textarea value={newPost} onChange={e => setNewPost(e.target.value)}
                  placeholder="Share your quest progress..."
                  rows={2}
                  style={{ flex: 1, background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", padding: "8px", fontFamily: "'Outfit', sans-serif", fontSize: 14, resize: "none", outline: "none" }} />
              </div>
              <button onClick={handlePostFeed} style={{
                float: "right", background: "#fbbf24", border: "none", color: "#000",
                fontFamily: "'Press Start 2P'", fontSize: 9, padding: "8px 14px", cursor: "pointer",
                boxShadow: "3px 3px 0 #92400e",
              }}>POST ▶</button>
              <div style={{ clear: "both" }} />
            </div>

            {feed.map(p => <FeedPost key={p.id} post={p} onReact={handleReact} />)}
          </div>
        )}

        {/* PROFILE ─────────────────────────────────────────────── */}
        {tab === "profile" && (
          <div style={{ animation: "fadeInUp 0.3s ease" }}>
            {/* Hero */}
            <div style={{
              background: "linear-gradient(135deg, rgba(139,92,246,0.2), rgba(251,191,36,0.1))",
              border: "2px solid rgba(139,92,246,0.3)",
              padding: "24px 20px", marginBottom: 20, textAlign: "center",
            }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
                <PixelAvatar color={profile?.avatarColor || "#8b5cf6"} size={72} username={profile?.username || "?"} />
              </div>
              <h2 style={{ fontFamily: "'Press Start 2P'", fontSize: 14, color: "#fbbf24", marginBottom: 4 }}>{profile?.username}</h2>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", fontFamily: "'Outfit', sans-serif", marginBottom: 12 }}>{profile?.bio || "On a quest for greatness."}</p>
              <div style={{ display: "inline-block", background: `${lvl.color}20`, border: `2px solid ${lvl.color}40`, padding: "4px 14px" }}>
                <span style={{ fontFamily: "'Press Start 2P'", fontSize: 9, color: lvl.color }}>LV.{lvl.level} — {lvl.title}</span>
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 20 }}>
              {[
                { label: "TOTAL XP", value: totalXP.toLocaleString(), color: "#fbbf24" },
                { label: "STREAK", value: `🔥${stats.streak}`, color: "#f472b6" },
                { label: "TASKS DONE", value: stats.totalTasks + doneCount, color: "#10b981" },
              ].map(s => (
                <div key={s.label} style={{ background: "rgba(255,255,255,0.04)", border: "2px solid rgba(255,255,255,0.07)", padding: "12px", textAlign: "center" }}>
                  <div style={{ fontFamily: "'Press Start 2P'", fontSize: 13, color: s.color, marginBottom: 4 }}>{s.value}</div>
                  <div style={{ fontFamily: "'Press Start 2P'", fontSize: 8, color: "rgba(255,255,255,0.35)" }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* XP bar */}
            <div style={{ background: "rgba(255,255,255,0.04)", border: "2px solid rgba(255,255,255,0.07)", padding: "14px", marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontFamily: "'Press Start 2P'", fontSize: 9, color: lvl.color }}>LEVEL {lvl.level}</span>
                <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{lvl.nextXP ? `${lvl.nextXP - totalXP} XP to next` : "MAX LEVEL!"}</span>
              </div>
              <XPBar progress={lvl.progress} color={lvl.color} height={14} />
            </div>

            {/* Achievements */}
            <h3 style={{ fontFamily: "'Press Start 2P'", fontSize: 11, color: "#fbbf24", marginBottom: 12 }}>ACHIEVEMENTS</h3>
            <div style={{ display: "grid", gap: 8 }}>
              {ACHIEVEMENTS.map(a => (
                <AchievementBadge key={a.id} ach={a} unlocked={unlockedAchs.has(a.id)} />
              ))}
            </div>

            {/* Friends */}
            <h3 style={{ fontFamily: "'Press Start 2P'", fontSize: 11, color: "#fbbf24", margin: "20px 0 12px" }}>PARTY MEMBERS</h3>
            {DEMO_FRIENDS.map(f => (
              <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", marginBottom: 8, background: "rgba(255,255,255,0.03)", border: "2px solid rgba(255,255,255,0.06)" }}>
                <PixelAvatar color={f.avatar} size={38} username={f.username} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 600, fontSize: 14, color: "#f1f5f9" }}>{f.username}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "'Outfit', sans-serif" }}>{getLevel(f.totalXP).title}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "'Press Start 2P'", fontSize: 10, color: "#fbbf24" }}>{f.totalXP.toLocaleString()} XP</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: "'Outfit', sans-serif" }}>🔥 {f.streak}d</div>
                </div>
              </div>
            ))}

            <button onClick={() => { setScreen("login"); setProfile(null); }} style={{
              width: "100%", marginTop: 20, padding: "12px", background: "transparent",
              border: "2px solid rgba(239,68,68,0.3)", color: "rgba(239,68,68,0.6)",
              fontFamily: "'Press Start 2P'", fontSize: 9, cursor: "pointer",
            }}>LOGOUT</button>
          </div>
        )}
      
      </div>

      {/* Bottom Nav */}
      <nav style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        background: "rgba(13,13,26,0.97)",
        borderTop: "2px solid rgba(251,191,36,0.2)",
        display: "flex", justifyContent: "space-around", alignItems: "center",
        padding: "8px 0", zIndex: 100,
        backdropFilter: "blur(10px)",
      }}>
        {NAV_TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, background: "transparent", border: "none", cursor: "pointer",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "6px 0",
          }}>
            <span style={{ fontSize: 18, filter: tab === t.id ? "none" : "grayscale(0.7) opacity(0.5)" }}>{t.icon}</span>
            <span style={{ fontFamily: "'Press Start 2P'", fontSize: 7, color: tab === t.id ? "#fbbf24" : "rgba(255,255,255,0.3)" }}>{t.label}</span>
          </button>
          
        ))}
      </nav>
    </div>
  );
}
