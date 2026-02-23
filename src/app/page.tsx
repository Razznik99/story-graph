"use client";

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import {
  TrendingUp,
  BookOpen,
  ArrowRight,
  PlayCircle,
  Network,
  Database,
  Layers,
  Activity,
  Wand2,
  ImageIcon,
  CalendarDays,
  MessageSquare,
  Bot,
  Check,
  X
} from 'lucide-react';

export default function Home() {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const [isYearly, setIsYearly] = useState(true);
  const { data: session, status } = useSession();
  const isAuthenticated = status === 'authenticated';

  useEffect(() => {
    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.reveal').forEach((el) => {
      observerRef.current?.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-[#0d0c0b] text-[#f7f7f5] font-sans selection:bg-amber-500 selection:text-white">
      <style dangerouslySetInnerHTML={{
        __html: `
        .text-gradient {
            background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 50%, #f59e0b 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        .glass {
            background: rgba(26, 24, 22, 0.6);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(245, 158, 11, 0.1);
        }
        .glass-strong {
            background: rgba(26, 24, 22, 0.8);
            backdrop-filter: blur(30px);
            border: 1px solid rgba(245, 158, 11, 0.15);
        }
        .reveal {
            opacity: 0;
            transform: translateY(2rem);
            transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .reveal.active {
            opacity: 1;
            transform: translateY(0);
        }
        @keyframes fadeUp {
            0% { opacity: 0; transform: translateY(30px); }
            100% { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-up {
            animation: fadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            opacity: 0;
        }
        @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-20px); }
        }
        .animate-float {
            animation: float 6s ease-in-out infinite;
        }
        @keyframes pulse-slow {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
        .animate-pulse-slow {
            animation: pulse-slow 4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        .nav-blur {
            background: rgba(13, 12, 11, 0.8);
            backdrop-filter: blur(20px);
        }
      `}} />

      {/* Navigation */}
      <nav className="fixed w-full z-50 nav-blur border-b border-[#2d2926]/50 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
                <Image
                  src="/logo-dark.svg"
                  alt="Story Graph"
                  width={28}
                  height={28}
                  className="mx-auto my-auto"
                  priority
                />
              </div>
              <span className="font-serif text-2xl font-bold tracking-tight">Story <span className="text-amber-500">Graph</span></span>
            </div>

            <div className="hidden md:flex items-center gap-8">
              <a href="#architecture" className="text-[#d1ccc2] hover:text-amber-500 transition-colors text-sm font-medium">Architecture</a>
              <a href="#ai-features" className="text-[#d1ccc2] hover:text-amber-500 transition-colors text-sm font-medium">AI Features</a>
              <a href="#why-it-matters" className="text-[#d1ccc2] hover:text-amber-500 transition-colors text-sm font-medium">Philosophy</a>
              <a href="#pricing" className="text-[#d1ccc2] hover:text-amber-500 transition-colors text-sm font-medium">Pricing</a>
            </div>

            <div className="flex items-center gap-4">
              {!isAuthenticated ? (
                <>
                  <Link href="/login" className="hidden sm:block text-[#d1ccc2] hover:text-white transition-colors text-sm font-medium">Sign In</Link>
                  <Link href="/login" className="bg-amber-500 hover:bg-amber-400 text-[#0d0c0b] px-6 py-2.5 rounded-lg font-semibold text-sm transition-all hover:scale-105 hover:shadow-lg hover:shadow-amber-500/25">
                    Start Writing
                  </Link>
                </>
              ) : (
                <Link href="/dashboard" className="bg-amber-500 hover:bg-amber-400 text-[#0d0c0b] px-6 py-2.5 rounded-lg font-semibold text-sm transition-all hover:scale-105 hover:shadow-lg hover:shadow-amber-500/25">
                  Dashboard
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl animate-pulse-slow"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-600/5 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%20%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23f59e0b%22%20fill-opacity%3D%220.03%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-20"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mt-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8 animate-fade-up" style={{ animationDelay: '0.1s' }}>
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            <span className="text-amber-500 text-sm font-medium tracking-wide border-r border-amber-500/30 pr-3 mr-1">Public Beta</span>
            <span className="text-[#d1ccc2] text-sm tracking-wide">Graph-based planning is here</span>
          </div>

          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold leading-tight mb-6 animate-fade-up" style={{ animationDelay: '0.2s' }}>
            Stories aren't linear.<br />
            <span className="text-gradient italic">Your tools shouldn't be either.</span>
          </h1>

          <p className="text-lg sm:text-xl text-[#d1ccc2] max-w-3xl mx-auto mb-10 font-light leading-relaxed animate-fade-up" style={{ animationDelay: '0.3s' }}>
            Story Graph lets you design stories as interconnected structures, not messy documents. Plan characters, events, timelines, and chapters with precision from start to finish.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-24 animate-fade-up" style={{ animationDelay: '0.4s' }}>
            <Link href={isAuthenticated ? "/dashboard" : "/login"} className="bg-amber-500 hover:bg-amber-400 text-[#0d0c0b] px-8 py-4 rounded-xl font-semibold text-lg transition-all hover:scale-105 hover:shadow-2xl hover:shadow-amber-500/25 flex items-center gap-2">
              Start Building Your Story
              <ArrowRight className="w-5 h-5" />
            </Link>
            <button className="glass-strong text-[#f7f7f5] px-8 py-4 rounded-xl font-semibold text-lg transition-all hover:bg-[#1a1816] flex items-center gap-2 group">
              <PlayCircle className="w-5 h-5 group-hover:text-amber-500 transition-colors" />
              View Demo
            </button>
          </div>
        </div>
      </section>

      <section className="py-24 border-t border-[#2d2926]/50 bg-[#1a1816]/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center reveal">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#2d2926] mb-8 text-amber-500">
            <Layers className="w-8 h-8" />
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
            Most stories die in fragments.
          </h2>
          <p className="text-lg text-[#d1ccc2] leading-relaxed max-w-2xl mx-auto">
            Ideas live in notebooks, notes apps, and scattered documents. Writers think in connections, yet traditional tools force them into flat, linear pages. <br /><br />
            <strong className="text-white font-semibold">Story Graph bridges that gap.</strong>
          </p>
        </div>
      </section>

      <section id="architecture" className="py-32 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-20 reveal">
            <h2 className="font-serif text-4xl sm:text-5xl font-bold mb-6">
              Built on a <span className="text-gradient">Story Graph Architecture.</span>
            </h2>
            <p className="text-[#d1ccc2] text-lg leading-relaxed">
              Design your story like a system. See relationships instantly, track cause and effect, prevent plot holes, and maintain structural clarity from a short story to a multi-book saga.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="glass p-8 rounded-2xl reveal hover:-translate-y-2 transition-transform duration-300">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center mb-6 border border-amber-500/20">
                <Layers className="w-6 h-6 text-amber-500" />
              </div>
              <h3 className="font-serif text-xl font-semibold mb-3 text-[#f7f7f5]">Card</h3>
              <p className="text-[#d1ccc2] leading-relaxed text-sm">
                The atomic unit. A character, object, location, or concept. Define its core attributes and let it evolve.
              </p>
            </div>

            <div className="glass p-8 rounded-2xl reveal hover:-translate-y-2 transition-transform duration-300" style={{ transitionDelay: '100ms' }}>
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-6 border border-emerald-500/20">
                <CalendarDays className="w-6 h-6 text-emerald-500" />
              </div>
              <h3 className="font-serif text-xl font-semibold mb-3 text-[#f7f7f5]">Event</h3>
              <p className="text-[#d1ccc2] leading-relaxed text-sm">
                Something that happens. Events connect cards, create change, and push your narrative forward.
              </p>
            </div>

            <div className="glass p-8 rounded-2xl reveal hover:-translate-y-2 transition-transform duration-300" style={{ transitionDelay: '200ms' }}>
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-6 border border-blue-500/20">
                <TrendingUp className="w-6 h-6 text-blue-500" />
              </div>
              <h3 className="font-serif text-xl font-semibold mb-3 text-[#f7f7f5]">Timeline</h3>
              <p className="text-[#d1ccc2] leading-relaxed text-sm">
                Events arranged in causal and chronological order. Build branching logical paths or straightforward plots.
              </p>
            </div>

            <div className="glass p-8 rounded-2xl reveal hover:-translate-y-2 transition-transform duration-300" style={{ transitionDelay: '300ms' }}>
              <div className="w-12 h-12 rounded-xl bg-[#e8e6e1]/10 flex items-center justify-center mb-6 border border-[#e8e6e1]/20">
                <BookOpen className="w-6 h-6 text-[#e8e6e1]" />
              </div>
              <h3 className="font-serif text-xl font-semibold mb-3 text-[#f7f7f5]">Chapter</h3>
              <p className="text-[#d1ccc2] leading-relaxed text-sm">
                Narrative containers that group events into readable structure. The bridge from planning to drafting.
              </p>
            </div>
          </div>
        </div>
      </section >

      <section id="ai-features" className="py-24 bg-[#1a1816]/50 relative border-t border-[#2d2926]/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="reveal">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 text-xs font-semibold uppercase tracking-wider mb-6 border border-amber-500/20">
                <Wand2 className="w-3 h-3" />
                AI-Powered Tools
              </div>
              <h3 className="font-serif text-3xl lg:text-5xl font-bold mb-6">
                A Co-Pilot That Knows<br />
                <span className="text-gradient">Your Story World.</span>
              </h3>
              <p className="text-[#d1ccc2] text-lg leading-relaxed mb-8">
                Our AI isn't just a generic chatbot. It has deep integration with your Story Graph, understanding your characters, events, and timelines.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start gap-4">
                  <div className="mt-1 bg-[#2d2926] border border-[#d1ccc2]/20 p-2 rounded-lg">
                    <MessageSquare className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Context-Aware Chat</h4>
                    <p className="text-[#d1ccc2] text-sm mt-1">Discuss your story with an AI that actively reads your project context. Reference cards, events, and notes seamlessly using @mentions.</p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <div className="mt-1 bg-[#2d2926] border border-[#d1ccc2]/20 p-2 rounded-lg">
                    <Bot className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Entity Generator</h4>
                    <p className="text-[#d1ccc2] text-sm mt-1">Stuck on worldbuilding? Let the AI generate attributes, locations, or rich character backstories directly into your database schema.</p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <div className="mt-1 bg-[#2d2926] border border-[#d1ccc2]/20 p-2 rounded-lg">
                    <ImageIcon className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Cover & Card Art</h4>
                    <p className="text-[#d1ccc2] text-sm mt-1">Visualize your characters and landscapes instantly using built-in Stability AI integration for high-quality image generation.</p>
                  </div>
                </li>
              </ul>
            </div>

            <div className="relative reveal">
              <div className="absolute -inset-1 bg-gradient-to-tr from-amber-500/20 to-blue-500/20 rounded-2xl blur-lg"></div>
              <div className="relative glass-strong p-6 rounded-2xl border border-[#2d2926] flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-[#2d2926] pb-4">
                  <span className="font-semibold text-sm flex items-center gap-2"><Bot className="w-4 h-4 text-amber-500" /> AI Assistant</span>
                  <span className="text-xs text-[#d1ccc2] bg-[#2d2926] px-2 py-1 rounded">Model: Gemini 2.5</span>
                </div>

                <div className="flex flex-col gap-3 h-64 overflow-y-auto pr-2" style={{ scrollbarWidth: 'thin', scrollbarColor: '#2d2926 transparent' }}>
                  <div className="self-end bg-amber-500/10 border border-amber-500/20 text-[#f7f7f5] text-sm p-3 rounded-lg max-w-[85%]">
                    Can you create a location card for the <span className="bg-amber-500/20 text-amber-500 px-1 rounded">@Crimson Citadel</span>?
                  </div>
                  <div className="self-start glass text-[#d1ccc2] text-sm p-3 rounded-lg max-w-[90%] flex flex-col gap-2">
                    <p>I've generated the location card and its attributes based on your previous story events.</p>
                    <div className="bg-[#0d0c0b] p-2 rounded border border-[#2d2926] mt-2 flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-[#2d2926] flex items-center justify-center">
                        <Database className="w-4 h-4 text-amber-500" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-white">Crimson Citadel</div>
                        <div className="text-[10px] text-[#d1ccc2]">Location • 4 Attributes generated</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#2d2926]">
                  <div className="bg-[#0d0c0b] border border-[#2d2926] rounded-lg p-2 flex items-center gap-2">
                    <span className="text-amber-500 font-medium px-1">@</span>
                    <span className="text-[#d1ccc2] text-sm flex-1">Ask anything...</span>
                    <div className="bg-amber-500 text-black p-1.5 rounded-md">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="why-it-matters" className="py-32 relative text-center">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-amber-500/20 to-transparent"></div>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 reveal">
          <h2 className="font-serif text-3xl sm:text-4xl font-bold mb-10 leading-relaxed text-[#f7f7f5]">
            Every writer has a story in their head. <br />
            A world. Characters. Conflicts.
          </h2>
          <p className="text-xl text-[#d1ccc2] font-light leading-loose mb-12">
            The problem isn't imagination.<br />
            The problem is organization.<br /><br />
            <span className="text-white font-medium">Story Graph turns ideas into structure.</span><br />
            Structure turns ideas into stories.<br />
            Stories turn into reality.<br />
          </p>
        </div>
      </section>

      <section id="pricing" className="py-32">
        <div className="max-w-[85rem] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 reveal">
            <h2 className="font-serif text-4xl sm:text-5xl font-bold mb-6">
              Invest in your<br />
              <span className="text-gradient">craft.</span>
            </h2>
            <p className="text-[#d1ccc2] text-lg leading-relaxed">
              Choose the plan that fits your storytelling journey.
            </p>
          </div>

          <div className="flex justify-center mb-12 reveal">
            <div className="glass p-1 rounded-xl inline-flex relative">
              <button
                onClick={() => setIsYearly(false)}
                className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${!isYearly ? 'bg-amber-500 text-[#0d0c0b]' : 'text-[#d1ccc2] hover:text-white'
                  }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setIsYearly(true)}
                className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${isYearly ? 'bg-amber-500 text-[#0d0c0b]' : 'text-[#d1ccc2] hover:text-white'
                  }`}
              >
                Yearly <span className={isYearly ? "text-[#0d0c0b] text-xs ml-1 font-bold" : "text-amber-500 text-xs ml-1"}>-20%</span>
              </button>
            </div>
          </div>

          <div className="grid lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {/* Free */}
            <div className="glass p-8 rounded-2xl reveal flex flex-col">
              <h3 className="font-serif text-2xl font-bold mb-2">Free</h3>
              <p className="text-[#8a867c] text-sm mb-6">For writers trying it out</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-[#f7f7f5]">$0</span>
                <span className="text-[#8a867c]">/month</span>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-start gap-3 text-[#d1ccc2] text-sm opacity-50">
                  <X className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>0 AI Tokens & Images</span>
                </li>
                <li className="flex items-start gap-3 text-[#d1ccc2] text-sm">
                  <Check className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <span>200 Image Uploads</span>
                </li>
                <li className="flex items-start gap-3 text-[#d1ccc2] text-sm">
                  <Check className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <span>5 Stories max</span>
                </li>
                <li className="flex items-start gap-3 text-[#d1ccc2] text-sm">
                  <Check className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <span>2k Cards & 2k Events</span>
                </li>
                <li className="flex items-start gap-3 text-[#d1ccc2] text-sm opacity-50">
                  <X className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>No Collaboration</span>
                </li>
              </ul>
              <button className="w-full py-3 rounded-lg border border-[#2d2926] text-[#d1ccc2] font-semibold hover:border-amber-500 hover:text-amber-500 transition-all mt-auto">
                Current Plan
              </button>
            </div>

            {/* Scribe */}
            <div className="glass p-8 rounded-2xl reveal flex flex-col hover:-translate-y-1 transition-transform border-amber-500/20" style={{ transitionDelay: '100ms' }}>
              <h3 className="font-serif text-2xl font-bold mb-2">Scribe</h3>
              <p className="text-[#8a867c] text-sm mb-6">For active storytellers</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-[#f7f7f5]">${isYearly ? '5' : '7'}</span>
                <span className="text-[#8a867c]">/month</span>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-start gap-3 text-[#d1ccc2] text-sm">
                  <Check className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <span>1 Million AI Tokens / month</span>
                </li>
                <li className="flex items-start gap-3 text-[#d1ccc2] text-sm">
                  <Check className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <span>100 AI Images / month</span>
                </li>
                <li className="flex items-start gap-3 text-[#d1ccc2] text-sm">
                  <Check className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <span>1k Image Uploads / month</span>
                </li>
                <li className="flex items-start gap-3 text-[#d1ccc2] text-sm">
                  <Check className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <span>Unlimited Stories, Cards, Events</span>
                </li>
                <li className="flex items-start gap-3 text-[#d1ccc2] text-sm">
                  <Check className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <span>3 Collaborators</span>
                </li>
                <li className="flex items-start gap-3 text-[#d1ccc2] text-sm">
                  <Check className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <span>StoryGraph AI Access</span>
                </li>
              </ul>
              <button className="w-full py-3 rounded-lg border border-[#2d2926] text-[#d1ccc2] font-semibold hover:border-amber-500 hover:text-amber-500 transition-all mt-auto">
                Upgrade
              </button>
            </div>

            {/* Author */}
            <div className="glass p-8 rounded-2xl relative reveal hover:-translate-y-1 transition-transform scale-[1.02] shadow-2xl shadow-amber-500/10 border-amber-500/40 bg-gradient-to-b from-amber-500/5 to-transparent flex flex-col" style={{ transitionDelay: '200ms' }}>
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-amber-500 text-[#0d0c0b] px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                  Most Popular
                </span>
              </div>
              <h3 className="font-serif text-2xl font-bold mb-2">Author</h3>
              <p className="text-[#8a867c] text-sm mb-6">For prolific creators</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-[#f7f7f5]">${isYearly ? '10' : '13'}</span>
                <span className="text-[#8a867c]">/month</span>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-start gap-3 text-[#d1ccc2] text-sm">
                  <Check className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <span>2.5 Million AI Tokens</span>
                </li>
                <li className="flex items-start gap-3 text-[#d1ccc2] text-sm">
                  <Check className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <span>300 AI Images / month</span>
                </li>
                <li className="flex items-start gap-3 text-[#d1ccc2] text-sm">
                  <Check className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <span>5k Image Uploads / month</span>
                </li>
                <li className="flex items-start gap-3 text-[#d1ccc2] text-sm">
                  <Check className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <span>Unlimited Stories, Cards, Events</span>
                </li>
                <li className="flex items-start gap-3 text-[#d1ccc2] text-sm">
                  <Check className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <span>10 Collaborators</span>
                </li>
                <li className="flex items-start gap-3 text-[#d1ccc2] text-sm">
                  <Check className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <span>StoryGraph AI Access</span>
                </li>
              </ul>
              <button className="w-full py-3 rounded-lg bg-amber-500 text-[#0d0c0b] font-semibold hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/25 mt-auto">
                Upgrade to Author
              </button>
            </div>

            {/* Oracle */}
            <div className="glass p-8 rounded-2xl reveal flex flex-col hover:-translate-y-1 transition-transform border-blue-500/20" style={{ transitionDelay: '300ms' }}>
              <h3 className="font-serif text-2xl font-bold mb-2">Oracle</h3>
              <p className="text-[#8a867c] text-sm mb-6">For studios & power users</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-[#f7f7f5]">${isYearly ? '20' : '25'}</span>
                <span className="text-[#8a867c]">/month</span>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-start gap-3 text-[#d1ccc2] text-sm">
                  <Check className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <span>6 Million AI Tokens</span>
                </li>
                <li className="flex items-start gap-3 text-[#d1ccc2] text-sm">
                  <Check className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <span>700 AI Images / month</span>
                </li>
                <li className="flex items-start gap-3 text-[#d1ccc2] text-sm">
                  <Check className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <span>Unlimited Image Uploads</span>
                </li>
                <li className="flex items-start gap-3 text-[#d1ccc2] text-sm">
                  <Check className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <span>Unlimited Everything</span>
                </li>
                <li className="flex items-start gap-3 text-[#d1ccc2] text-sm">
                  <Check className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <span>Unlimited Collaborators</span>
                </li>
                <li className="flex items-start gap-3 text-[#d1ccc2] text-sm">
                  <Check className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <span className="text-white">Beta Access (First Features)</span>
                </li>
              </ul>
              <button className="w-full py-3 rounded-lg border border-[#2d2926] text-[#d1ccc2] font-semibold hover:border-blue-500 hover:text-blue-500 transition-all mt-auto">
                Upgrade
              </button>
            </div>
          </div>
        </div>
      </section>
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#1a1816] to-[#0d0c0b]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent"></div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 reveal">
          <h2 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
            Start building your story today.
          </h2>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-12">
            <Link href={isAuthenticated ? "/dashboard" : "/login"} className="bg-amber-500 hover:bg-amber-400 text-[#0d0c0b] px-10 py-4 rounded-xl font-semibold text-lg transition-all hover:scale-105 hover:shadow-2xl hover:shadow-amber-500/25 flex items-center justify-center gap-2">
              Launch Story Graph
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#2d2926]/50 bg-[#0d0c0b] pt-12 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="font-serif font-bold text-[#f7f7f5]">Story <span className="text-amber-500">Graph</span></span>
            </div>
            <p className="text-[#8a867c] text-sm">
              © {new Date().getFullYear()} Story Graph. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div >
  );
}
