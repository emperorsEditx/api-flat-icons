
import axios from 'axios';
import FormData from 'form-data';
import * as fs from 'fs';
import * as path from 'path';

const API_URL = 'http://127.0.0.1:8000';
const USER_ID = 1; // Assuming admin/existing user ID

async function runVerification() {
  console.log('Starting E2E Workflow Verification...');
  
  try {
    // 1. Upload Temp Icon
    console.log('\n[1/5] Uploading Temp Icon...');
    const form = new FormData();
    // Create a dummy file
    const dummyPath = path.join(__dirname, 'test-icon.svg');
    fs.writeFileSync(dummyPath, '<svg></svg>');
    form.append('files', fs.createReadStream(dummyPath), 'test-icon.svg');
    form.append('createdBy', String(USER_ID));

    const uploadRes = await axios.post(`${API_URL}/icons/temp-upload`, form, {
      headers: form.getHeaders(),
    });
    
    // Response is array of TempIconResponse, but we need the DB ID.
    // Wait, tempUpload controller implementation creates DB entry but returns:
    // { tempName, originalName, previewUrl }
    // It DOES NOT return the ID! This is a gap in the controller.
    // However, getDrafts(userId) returns the DB entries.
    // So we must Upload -> Then Get Drafts to find the ID.
    
    console.log('✅ Uploaded. Fetching drafts to get ID...');
    
    const draftsRes = await axios.get(`${API_URL}/icons/drafts/${USER_ID}`);
    const drafts = draftsRes.data;
    if (drafts.length === 0) throw new Error('No drafts found after upload');
    
    const icon = drafts[0]; // Assuming latest or only one
    console.log('✅ Draft Found:', icon.id, icon.title);

    // 2. Update Metadata
    console.log('\n[2/5] Updating Metadata...');
    await axios.patch(`${API_URL}/icons/${icon.id}`, {
      title: 'Verified Icon',
      categoryId: 1, // Assuming category 1 exists
      subCategoryId: 1, // Assuming subcategory 1 exists
      style: 'OUTLINE',
      tags: ['verification', 'test'],
    });
    console.log('✅ Metadata Updated');

    // 3. Publish (Draft -> Pending)
    console.log('\n[3/5] Publishing (Draft -> Pending)...');
    await axios.post(`${API_URL}/icons/${icon.id}/publish`);
    console.log('✅ Published');

    // 4. Approve (Pending -> Active)
    console.log('\n[4/5] Approving (Pending -> Active)...');
    const approveRes = await axios.post(`${API_URL}/icons/approve`, {
      ids: [icon.id],
    });
    console.log('✅ Approved:', approveRes.data);

    // 5. Verify in Public List
    console.log('\n[5/5] Verifying in Approved List...');
    const listRes = await axios.get(`${API_URL}/icons/approved`);
    const found = listRes.data.find((i: any) => i.id === icon.id);
    
    if (found && found.status === 'ACTIVE' && found.approved) {
        console.log('✅ SUCCESS: Icon found in approved list with correct status.');
    } else {
        console.error('❌ FAILURE: Icon not found or incorrect status', found);
    }

    // Cleanup
    if (fs.existsSync(dummyPath)) fs.unlinkSync(dummyPath);

  } catch (error: any) {
    if (error.response) {
      console.error('❌ Verification Failed (Response):', error.response.status, error.response.data);
    } else if (error.request) {
      console.error('❌ Verification Failed (No Response):', error.request);
    } else {
      console.error('❌ Verification Failed (Message):', error.message);
    }
    console.error('Full Error:', error);
  }
}

runVerification();
