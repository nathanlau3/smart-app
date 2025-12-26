export default function Loading() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-primary/20 animate-pulse" />
          <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-transparent border-t-primary animate-spin" />
        </div>
        <p className="text-muted-foreground animate-pulse">
          Loading Smart Maps...
        </p>
      </div>
    </div>
  );
}
