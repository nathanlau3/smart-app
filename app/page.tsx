import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import Link from "next/link";
import {
  Sparkles,
  Upload,
  MessageSquare,
  Database,
  Brain,
  Zap,
} from "lucide-react";

export default async function Index() {
  const cookeStore = cookies();
  const supabase = createServerComponentClient({ cookies: () => cookeStore });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="w-full min-h-screen flex flex-col items-center relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
      <div className="absolute top-20 left-1/4 w-64 h-64 bg-primary/20 rounded-full blur-3xl animate-float pointer-events-none" />
      <div className="absolute bottom-40 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse-glow pointer-events-none" />

      <div className="flex flex-col gap-16 max-w-6xl px-6 py-16 lg:py-24 text-foreground relative z-10">
        <div className="flex flex-col items-center gap-8 mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 ai-glow">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">
              AI-Powered Chat
            </span>
          </div>

          <h1 className="text-5xl lg:text-7xl font-bold text-center leading-tight">
            <span className="gradient-text">Chat with Your Own Datas</span>
            <br />
            <span className="text-foreground/80">Using AI Technology</span>
          </h1>

          <p className="text-lg lg:text-xl text-muted-foreground text-center max-w-2xl">
            Upload your documents, sync reports, and leverage advanced RAG
            capabilities to get intelligent insights from your data
          </p>

          {user ? (
            <div className="flex flex-col sm:flex-row gap-4 mt-4">
              <Link
                href="/files"
                className="group relative px-8 py-4 rounded-lg bg-card border border-border hover:border-primary/50 transition-all duration-300 flex items-center gap-3 hover:ai-glow"
              >
                <Upload className="w-5 h-5 text-primary" />
                <span className="font-semibold">Upload Files</span>
              </Link>
              <Link
                href="/chat"
                className="group relative px-8 py-4 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300 flex items-center gap-3 ai-glow-lg"
              >
                <MessageSquare className="w-5 h-5" />
                <span className="font-semibold">Start Chatting</span>
              </Link>
              <Link
                href="/sync-report"
                className="group relative px-8 py-4 rounded-lg bg-card border border-border hover:border-primary/50 transition-all duration-300 flex items-center gap-3 hover:ai-glow"
              >
                <Database className="w-5 h-5 text-primary" />
                <span className="font-semibold">Sync Reports</span>
              </Link>
            </div>
          ) : (
            <div className="flex gap-4 mt-4">
              <Link
                href="/login"
                className="px-10 py-4 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300 font-semibold ai-glow-lg"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>

        <div className="w-full h-px bg-gradient-to-r from-transparent via-border to-transparent" />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="gradient-border p-6 rounded-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Brain className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Smart RAG</h3>
            </div>
            <p className="text-muted-foreground">
              Advanced retrieval-augmented generation for accurate and
              contextual responses from your documents
            </p>
          </div>

          <div className="gradient-border p-6 rounded-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Lightning Fast</h3>
            </div>
            <p className="text-muted-foreground">
              Optimized embeddings and vector search deliver instant insights
              from large document collections
            </p>
          </div>

          <div className="gradient-border p-6 rounded-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Database className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Data Analytics</h3>
            </div>
            <p className="text-muted-foreground">
              Query, aggregate, and analyze your data with natural language
              using AI-powered tools
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
