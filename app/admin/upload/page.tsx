'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase';
import { Upload, CheckCircle, AlertCircle, Image as ImageIcon } from 'lucide-react';

export default function AdminUploadPage() {
  const [uploading, setUploading] = useState(false);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [message, setMessage] = useState<{text: string, type: 'success' | 'error'} | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setMessage(null);
    let successCount = 0;

    try {
      const supabase = createClient();

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('verification-images')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Get public URL - FIX: Use .data.publicUrl
        const { data } = supabase.storage
          .from('verification-images')
          .getPublicUrl(fileName);

        const publicUrl = data.publicUrl;

        // Insert into database
        const { error: dbError } = await supabase
          .from('verification_images')
          .insert({
            image_url: publicUrl,
            file_name: fileName,
            uploaded_at: new Date().toISOString(),
            is_active: true
          });

        if (dbError) throw dbError;
        successCount++;
      }

      setUploadedCount(successCount);
      setMessage({ 
        text: `Successfully uploaded ${successCount} image${successCount !== 1 ? 's' : ''}!`, 
        type: 'success' 
      });
    } catch (err: any) {
      setMessage({ 
        text: `Upload failed: ${err.message}`, 
        type: 'error' 
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl border border-slate-200 shadow-lg p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Upload className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Upload Verification Images</h1>
              <p className="text-slate-500">Upload images for users to verify</p>
            </div>
          </div>

          {message && (
            <div className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${
              message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}>
              {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              {message.text}
            </div>
          )}

          <div className="border-2 border-dashed border-slate-300 rounded-xl p-12 text-center">
            <ImageIcon className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600 mb-4">Select images to upload</p>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileUpload}
              disabled={uploading}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-lg cursor-pointer hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Upload className="w-5 h-5" />
              {uploading ? 'Uploading...' : 'Choose Images'}
            </label>
            <p className="text-xs text-slate-400 mt-4">
              Supported formats: JPG, PNG, GIF, WebP
            </p>
          </div>

          {uploadedCount > 0 && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-700 font-medium">
                ✅ {uploadedCount} image{uploadedCount !== 1 ? 's' : ''} uploaded successfully!
              </p>
              <p className="text-sm text-green-600 mt-1">
                These images will be randomly distributed to users for verification.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}