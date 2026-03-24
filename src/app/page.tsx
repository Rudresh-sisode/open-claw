import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Zap,
  Bot,
  Shield,
  RefreshCw,
  ArrowRight,
  CheckCircle2,
  Activity,
  Clock,
} from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Background */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,#1e1b4b_0%,transparent_60%)] pointer-events-none" />
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#18181b_1px,transparent_1px),linear-gradient(to_bottom,#18181b_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-20 pointer-events-none" />

      {/* Navbar */}
      <nav className="relative border-b border-zinc-800/50 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-zinc-100">OpenClaw</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">Sign In</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/signup">Get Started Free</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative mx-auto max-w-6xl px-6 pt-24 pb-20 text-center">
        <Badge variant="default" className="mb-6 inline-flex gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
          Now with Telegram Integration
        </Badge>
        <h1 className="text-5xl font-extrabold tracking-tight text-zinc-100 sm:text-6xl lg:text-7xl">
          Your AI Agent,
          <br />
          <span className="text-indigo-400">Running 24/7</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-zinc-400 leading-relaxed">
          OpenClaw gives you a personal AI agent that runs continuously on Vercel Sandboxes.
          Connect it to Telegram and chat with your AI from anywhere — no technical setup required.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Button size="lg" asChild className="gap-2 shadow-lg shadow-indigo-600/20">
            <Link href="/signup">
              Start for Free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/login">Sign In</Link>
          </Button>
        </div>

        {/* Social proof */}
        <p className="mt-8 text-sm text-zinc-600">
          No credit card required · 5-minute setup · 99.9% uptime guarantee
        </p>
      </section>

      {/* Features */}
      <section className="relative mx-auto max-w-6xl px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-zinc-100">Everything you need</h2>
          <p className="text-zinc-400 mt-3">Built for non-technical users. No CLI, no config files.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 hover:border-zinc-700 transition-colors"
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${f.iconBg} mb-4`}>
                <f.Icon className={`h-5 w-5 ${f.iconColor}`} />
              </div>
              <h3 className="font-semibold text-zinc-100 mb-2">{f.title}</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="relative mx-auto max-w-4xl px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-zinc-100">Up and running in 3 steps</h2>
        </div>
        <div className="space-y-6">
          {steps.map((step, i) => (
            <div key={i} className="flex items-start gap-5 rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white font-bold">
                {i + 1}
              </div>
              <div>
                <h3 className="font-semibold text-zinc-100 mb-1">{step.title}</h3>
                <p className="text-sm text-zinc-400">{step.description}</p>
              </div>
              <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5 ml-auto" />
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative mx-auto max-w-2xl px-6 py-20 text-center">
        <h2 className="text-3xl font-bold text-zinc-100 mb-4">
          Ready to launch your AI agent?
        </h2>
        <p className="text-zinc-400 mb-8">
          Set up in 5 minutes. Your AI will be running 24/7, ready to chat on Telegram.
        </p>
        <Button size="lg" asChild className="gap-2 shadow-lg shadow-indigo-600/20">
          <Link href="/signup">
            Create Your Agent
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-8">
        <div className="mx-auto max-w-6xl px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-indigo-600">
              <Zap className="h-3 w-3 text-white" />
            </div>
            <span className="text-sm font-semibold text-zinc-400">OpenClaw</span>
          </div>
          <p className="text-xs text-zinc-600">© {new Date().getFullYear()} OpenClaw. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

const features = [
  {
    title: 'Telegram Integration',
    description: 'Connect your AI agent to Telegram in minutes. Supports DMs, groups, topics, and inline buttons.',
    Icon: Bot,
    iconBg: 'bg-sky-600/15',
    iconColor: 'text-sky-400',
  },
  {
    title: '24/7 Auto-Uptime',
    description: 'Auto-extends sandbox timeout every 4 hours. If it ever goes down, it auto-restarts in under 30 seconds.',
    Icon: Clock,
    iconBg: 'bg-indigo-600/15',
    iconColor: 'text-indigo-400',
  },
  {
    title: 'Health Monitoring',
    description: 'Minute-by-minute health checks detect issues before you notice them. Fully automated recovery.',
    Icon: Activity,
    iconBg: 'bg-emerald-600/15',
    iconColor: 'text-emerald-400',
  },
  {
    title: 'No CLI Required',
    description: 'Everything is managed through a beautiful UI. No terminal, no config files, no technical knowledge needed.',
    Icon: Zap,
    iconBg: 'bg-amber-600/15',
    iconColor: 'text-amber-400',
  },
  {
    title: 'Access Control',
    description: 'Choose who can talk to your bot: pairing codes, allowlists, or open access. Per-group settings too.',
    Icon: Shield,
    iconBg: 'bg-violet-600/15',
    iconColor: 'text-violet-400',
  },
  {
    title: 'Auto-Restart Recovery',
    description: 'Pre-configured snapshots let your sandbox restart instantly — no setup needed again.',
    Icon: RefreshCw,
    iconBg: 'bg-rose-600/15',
    iconColor: 'text-rose-400',
  },
]

const steps = [
  {
    title: 'Sign up and create your AI sandbox',
    description: 'Create an account and click "Create AI Agent". Your personal OpenClaw instance spins up on Vercel in seconds.',
  },
  {
    title: 'Connect your Telegram bot',
    description: 'Create a bot with @BotFather, paste the token in our setup wizard, and choose your access policy. Done in 2 minutes.',
  },
  {
    title: 'Start chatting',
    description: 'Message your bot on Telegram. Your AI agent responds 24/7, automatically keeps itself alive, and never needs manual maintenance.',
  },
]
