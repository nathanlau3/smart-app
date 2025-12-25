'use client';

import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Upload, FileText, Download } from 'lucide-react';

export default function FilesPage() {
  const supabase = createClientComponentClient();
  const router = useRouter();

  const { data: documents } = useQuery(['files'], async () => {
    const { data, error } = await supabase
      .from('documents_with_storage_path')
      .select();

    if (error) {
      toast({
        variant: 'destructive',
        description: 'Failed to fetch documents',
      });
      throw error;
    }

    return data;
  });

  return (
    <div className="w-full min-h-screen flex flex-col items-center relative">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 pointer-events-none" />
      <div className="absolute top-10 left-1/4 w-48 h-48 bg-primary/10 rounded-full blur-3xl animate-pulse-glow pointer-events-none" />

      <div className="max-w-6xl w-full m-4 sm:m-10 flex flex-col gap-8 grow relative z-10">
        <div className="text-center space-y-2 mb-4">
          <h1 className="text-4xl font-bold gradient-text">Your Documents</h1>
          <p className="text-muted-foreground">Upload and manage your files</p>
        </div>

        <div className="gradient-border p-8 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 rounded-full bg-primary/10">
              <Upload className="w-8 h-8 text-primary" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold">Upload a Document</h3>
              <p className="text-sm text-muted-foreground">
                Select a file to add to your document collection
              </p>
            </div>
            <Input
              type="file"
              name="file"
              className="cursor-pointer w-full max-w-md border-primary/50 hover:border-primary transition-all duration-300"
              onChange={async (e) => {
                const selectedFile = e.target.files?.[0];

                if (selectedFile) {
                  const { error } = await supabase.storage
                    .from('files')
                    .upload(
                      `${crypto.randomUUID()}/${selectedFile.name}`,
                      selectedFile
                    );

                  if (error) {
                    toast({
                      variant: 'destructive',
                      description:
                        'There was an error uploading the file. Please try again.',
                    });
                    return;
                  }

                  toast({
                    description: 'File uploaded successfully!',
                  });

                  router.push('/chat');
                }
              }}
            />
          </div>
        </div>

        {documents && documents.length > 0 ? (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Uploaded Files</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {documents.map((document) => (
                <div
                  key={document.id}
                  className="gradient-border p-6 cursor-pointer hover:scale-105 transition-all duration-300 group"
                  onClick={async () => {
                    const { data, error } = await supabase.storage
                      .from('files')
                      .createSignedUrl(document.storage_object_path, 60);

                    if (error) {
                      toast({
                        variant: 'destructive',
                        description: 'Failed to download file. Please try again.',
                      });
                      return;
                    }

                    window.location.href = data.signedUrl;
                  }}
                >
                  <div className="flex flex-col items-center gap-3 text-center">
                    <div className="p-3 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <FileText className="w-8 h-8 text-primary" />
                    </div>
                    <p className="text-sm font-medium truncate w-full" title={document.name}>
                      {document.name}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                      <Download className="w-3 h-3" />
                      <span>Download</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : documents && documents.length === 0 ? (
          <div className="gradient-border p-12 text-center backdrop-blur-sm">
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 rounded-full bg-muted">
                <FileText className="w-12 h-12 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">No documents yet</h3>
                <p className="text-sm text-muted-foreground">
                  Upload your first document to get started
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
