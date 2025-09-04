import { projectId, publicAnonKey } from './supabase/info';

export interface ServerHealthData {
  status: string;
  timestamp: string;
  environment?: {
    hasDropboxToken: boolean;
    dropboxTokenLength: number;
  };
}

export const checkServerHealth = async (): Promise<ServerHealthData | null> => {
  try {
    console.log('🏥 Checking server health...');
    const healthResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3005c377/health`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${publicAnonKey}` }
    });

    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log('✅ Server health check:', healthData);
      return healthData;
    } else {
      console.error('❌ Server health check failed:', healthResponse.status);
      return null;
    }
  } catch (error) {
    console.error('💥 Server health check error:', error);
    return null;
  }
};

export const createDropboxFolder = async (folderName: string) => {
  console.log(`📂 Creating folder: "${folderName}"`);
  
  const folderResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3005c377/dropbox/create-folder`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${publicAnonKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ folderName })
  });

  console.log(`📊 Folder creation response status: ${folderResponse.status}`);

  if (!folderResponse.ok) {
    let errorData;
    try {
      // Clone the response to allow multiple reads if needed
      const responseClone = folderResponse.clone();
      errorData = await responseClone.json();
    } catch (jsonError) {
      try {
        // Use the original response for text if JSON parsing fails
        const errorText = await folderResponse.text();
        errorData = { error: 'Failed to parse error response', details: errorText };
      } catch (textError) {
        errorData = { error: 'Failed to read error response', details: `${folderResponse.status} ${folderResponse.statusText}` };
      }
    }
    
    console.error('❌ Folder creation failed:', errorData);
    throw new Error(`Folder creation failed: ${errorData.error || errorData.details || 'Unknown error'}`);
  }

  const folderResult = await folderResponse.json();
  console.log('✅ Folder created successfully:', folderResult);
  return folderResult;
};

export const uploadFilesToDropbox = async (files: File[], folderPath: string) => {
  const formData = new FormData();
  formData.append('folderPath', folderPath);
  
  files.forEach((file, index) => {
    console.log(`📎 Adding file ${index + 1}: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
    formData.append(`file${index}`, file);
  });

  console.log(`📤 Starting batch upload to: ${folderPath}`);

  const uploadResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3005c377/dropbox/upload-batch`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${publicAnonKey}`
    },
    body: formData
  });

  console.log(`📊 Upload response status: ${uploadResponse.status}`);

  if (!uploadResponse.ok) {
    let uploadErrorData;
    try {
      // Clone the response to allow multiple reads if needed
      const responseClone = uploadResponse.clone();
      uploadErrorData = await responseClone.json();
    } catch (jsonError) {
      try {
        // Use the original response for text if JSON parsing fails
        const errorText = await uploadResponse.text();
        uploadErrorData = { error: 'Failed to parse upload error response', details: errorText };
      } catch (textError) {
        uploadErrorData = { error: 'Failed to read upload error response', details: `${uploadResponse.status} ${uploadResponse.statusText}` };
      }
    }
    
    console.error('❌ File upload failed:', uploadErrorData);
    throw new Error(`File upload failed: ${uploadErrorData.error || uploadErrorData.details || 'Unknown error'}`);
  }

  const uploadResult = await uploadResponse.json();
  console.log('✅ Upload completed:', uploadResult);
  return uploadResult;
};