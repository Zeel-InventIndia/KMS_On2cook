import { Hono } from 'npm:hono';
import { googleSheetsUpdater } from './googleSheetsUpdater.tsx';
import * as kv from './kv_store.tsx';

const demoRequestsApp = new Hono();

// Update demo request (for recipes by presales team and team assignments by head chef)
demoRequestsApp.put('/demo-requests/:id', async (c) => {
  try {
    console.log('📝 Demo request update received');
    const requestId = c.req.param('id');
    const body = await c.req.json();
    
    console.log('📝 Request details:', {
      id: requestId,
      clientName: body.clientName,
      clientEmail: body.clientEmail,
      assignedTeam: body.assignedTeam,
      assignedSlot: body.assignedSlot,
      recipesCount: body.recipes?.length || 0,
      updatedBy: body.updatedBy
    });

    if (!body.clientName || !body.clientEmail) {
      return c.json({
        success: false,
        error: 'Client name and email are required for identifying the row'
      }, 400);
    }

    // Store in KV store for persistence
    const kvKey = `demo_request_${requestId}`;
    await kv.set(kvKey, {
      ...body,
      updatedAt: new Date().toISOString(),
      lastModifiedBy: body.updatedBy || 'system'
    });

    // Try to update Google Sheets if we have team assignment data
    let sheetsUpdateResult = null;
    if (body.assignedTeam !== undefined || body.assignedSlot !== undefined || body.recipes) {
      try {
        console.log('📊 Attempting Google Sheets update...');
        
        // Prepare update data for Google Sheets
        const updateData = {
          clientName: body.clientName,
          clientEmail: body.clientEmail
        };

        // Add recipes if provided
        if (body.recipes && Array.isArray(body.recipes)) {
          updateData.recipes = body.recipes;
        }

        // Add team assignment info as notes for now (you can extend GoogleSheetsUpdater to handle team columns)
        if (body.assignedTeam !== undefined || body.assignedSlot !== undefined) {
          const teamInfo = [];
          if (body.assignedTeam !== undefined) {
            teamInfo.push(`Team: ${body.assignedTeam}`);
          }
          if (body.assignedSlot !== undefined) {
            teamInfo.push(`Slot: ${body.assignedSlot}`);
          }
          updateData.notes = teamInfo.join(', ');
        }

        const sheetsResult = await googleSheetsUpdater.updateDemoRequest(updateData);
        sheetsUpdateResult = sheetsResult;

        if (sheetsResult.success) {
          console.log('✅ Google Sheets updated successfully');
        } else {
          console.warn('⚠️ Google Sheets update failed:', sheetsResult.error);
        }
      } catch (sheetsError) {
        console.error('💥 Google Sheets update error:', sheetsError);
        sheetsUpdateResult = {
          success: false,
          error: sheetsError instanceof Error ? sheetsError.message : 'Unknown sheets error'
        };
      }
    }

    console.log('✅ Demo request update completed');

    return c.json({
      success: true,
      message: 'Demo request updated successfully',
      data: {
        id: requestId,
        clientName: body.clientName,
        assignedTeam: body.assignedTeam,
        assignedSlot: body.assignedSlot,
        updatedBy: body.updatedBy,
        updatedAt: new Date().toISOString()
      },
      backend: {
        kvStored: true,
        sheetsUpdate: sheetsUpdateResult
      }
    });

  } catch (error) {
    console.error('💥 Error updating demo request:', error);
    return c.json({
      success: false,
      error: 'Failed to update demo request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// Get demo request by ID
demoRequestsApp.get('/demo-requests/:id', async (c) => {
  try {
    const requestId = c.req.param('id');
    const kvKey = `demo_request_${requestId}`;
    
    const demoRequest = await kv.get(kvKey);
    
    if (!demoRequest) {
      return c.json({
        success: false,
        error: 'Demo request not found'
      }, 404);
    }

    return c.json({
      success: true,
      data: demoRequest
    });

  } catch (error) {
    console.error('💥 Error fetching demo request:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch demo request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

export { demoRequestsApp };