import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
import * as kv from './kv_store.tsx';

const app = new Hono();

// Configure CORS
app.use('*', cors({
  origin: '*',
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));

app.use('*', logger(console.log));

// Simple task management using KV store only
app.post('/make-server-3005c377/tasks', async (c) => {
  try {
    const taskData = await c.req.json();
    
    const task = {
      ...taskData,
      id: taskData.id || `task_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Store in KV store
    await kv.set(`task_${task.id}`, task);

    console.log('✅ Task created:', task.title || task.id);

    return c.json({
      success: true,
      message: 'Task created successfully',
      data: task
    });

  } catch (error) {
    console.error('❌ Task creation failed:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// Get task by ID
app.get('/make-server-3005c377/tasks/:id', async (c) => {
  try {
    const taskId = c.req.param('id');
    const task = await kv.get(`task_${taskId}`);

    if (!task) {
      return c.json({
        success: false,
        error: 'Task not found'
      }, 404);
    }

    return c.json({
      success: true,
      data: task
    });

  } catch (error) {
    console.error('❌ Task fetch failed:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// Update task
app.put('/make-server-3005c377/tasks/:id', async (c) => {
  try {
    const taskId = c.req.param('id');
    const updateData = await c.req.json();

    const existingTask = await kv.get(`task_${taskId}`);
    if (!existingTask) {
      return c.json({
        success: false,
        error: 'Task not found'
      }, 404);
    }

    const updatedTask = {
      ...existingTask,
      ...updateData,
      id: taskId, // Ensure ID doesn't change
      updatedAt: new Date().toISOString()
    };

    await kv.set(`task_${taskId}`, updatedTask);

    return c.json({
      success: true,
      message: 'Task updated successfully',
      data: updatedTask
    });

  } catch (error) {
    console.error('❌ Task update failed:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// Delete task
app.delete('/make-server-3005c377/tasks/:id', async (c) => {
  try {
    const taskId = c.req.param('id');
    
    const existingTask = await kv.get(`task_${taskId}`);
    if (!existingTask) {
      return c.json({
        success: false,
        error: 'Task not found'
      }, 404);
    }

    await kv.del(`task_${taskId}`);

    return c.json({
      success: true,
      message: 'Task deleted successfully'
    });

  } catch (error) {
    console.error('❌ Task deletion failed:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// List all tasks (with optional filtering)
app.get('/make-server-3005c377/tasks', async (c) => {
  try {
    const status = c.req.query('status');
    const assignedTo = c.req.query('assignedTo');

    // Get all tasks with task_ prefix
    const tasks = await kv.getByPrefix('task_');

    let filteredTasks = tasks;

    // Apply filters if provided
    if (status) {
      filteredTasks = filteredTasks.filter(task => task.status === status);
    }
    
    if (assignedTo) {
      filteredTasks = filteredTasks.filter(task => task.assignedTo === assignedTo);
    }

    return c.json({
      success: true,
      data: filteredTasks,
      count: filteredTasks.length
    });

  } catch (error) {
    console.error('❌ Tasks fetch failed:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// Health check
app.get('/make-server-3005c377/tasks/health', (c) => {
  return c.json({
    status: 'OK',
    service: 'Task Management (KV Store)',
    timestamp: new Date().toISOString()
  });
});

export default app;