import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { CheckCircle, AlertCircle, ExternalLink, Download, Users, Calendar, User } from 'lucide-react';

interface CSVConfig {
  demoRequestsCsvUrl: string;
  tasksCsvUrl: string;
  isValid: boolean;
  lastUpdated?: string;
}

interface GoogleSheetsConfigProps {
  onConfigUpdate: (config: CSVConfig) => void;
  currentConfig: CSVConfig | null;
}

export function GoogleSheetsConfig({ onConfigUpdate, currentConfig }: GoogleSheetsConfigProps) {
  const [demoRequestsCsvUrl, setDemoRequestsCsvUrl] = useState(currentConfig?.demoRequestsCsvUrl || '');
  const [tasksCsvUrl, setTasksCsvUrl] = useState(currentConfig?.tasksCsvUrl || '');
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string>('');
  const [validationSuccess, setValidationSuccess] = useState<string>('');

  const validateCsvUrl = async (url: string): Promise<boolean> => {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      // Check if content type suggests CSV
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/csv') && !contentType.includes('text/plain') && !contentType.includes('application/octet-stream')) {
        console.warn('Content type may not be CSV:', contentType);
      }
      
      return true;
    } catch (error) {
      console.error('CSV URL validation error:', error);
      return false;
    }
  };

  const handleValidateAndSave = async () => {
    setIsValidating(true);
    setValidationError('');
    setValidationSuccess('');

    try {
      // Validate both URLs
      if (!demoRequestsCsvUrl.trim() || !tasksCsvUrl.trim()) {
        throw new Error('Both CSV URLs are required');
      }

      // Check if URLs look like valid URLs
      try {
        new URL(demoRequestsCsvUrl);
        new URL(tasksCsvUrl);
      } catch {
        throw new Error('Please enter valid URLs');
      }

      // Validate that URLs are accessible
      const [demoValid, tasksValid] = await Promise.all([
        validateCsvUrl(demoRequestsCsvUrl),
        validateCsvUrl(tasksCsvUrl)
      ]);

      if (!demoValid) {
        throw new Error('Demo Requests CSV URL is not accessible. Please check the URL and ensure the sheet is published as CSV.');
      }

      if (!tasksValid) {
        throw new Error('Tasks CSV URL is not accessible. Please check the URL and ensure the sheet is published as CSV.');
      }

      const config: CSVConfig = {
        demoRequestsCsvUrl: demoRequestsCsvUrl.trim(),
        tasksCsvUrl: tasksCsvUrl.trim(),
        isValid: true,
        lastUpdated: new Date().toISOString()
      };

      setValidationSuccess('Configuration validated successfully! CSV data will now be used.');
      onConfigUpdate(config);

    } catch (error) {
      setValidationError(error instanceof Error ? error.message : 'Validation failed');
    } finally {
      setIsValidating(false);
    }
  };

  const handleTestCsvUrl = async (url: string, type: 'demo' | 'tasks') => {
    if (!url.trim()) {
      alert('Please enter a CSV URL first');
      return;
    }

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const csvText = await response.text();
      const lines = csvText.trim().split('\n');
      
      if (lines.length < 2) {
        throw new Error('CSV must have at least a header row and one data row');
      }

      alert(`✅ ${type === 'demo' ? 'Demo Requests' : 'Tasks'} CSV is accessible!\n\nFound ${lines.length - 1} data rows\nFirst line (headers): ${lines[0].substring(0, 100)}...`);
    } catch (error) {
      alert(`❌ Error testing ${type === 'demo' ? 'Demo Requests' : 'Tasks'} CSV URL:\n\n${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="mb-2">CSV Data Integration Setup</h1>
        <p className="text-muted-foreground">
          Connect your Google Sheets data by publishing them as CSV files. This method is simple, reliable, and doesn't require API keys.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            How to Set Up CSV Integration
          </CardTitle>
          <CardDescription>
            Follow these steps to publish your Google Sheets as CSV files
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-4 rounded-lg space-y-3">
            <h4 className="font-medium">Step-by-Step Instructions:</h4>
            <ol className="space-y-2 text-sm list-decimal list-inside">
              <li>Open your Google Sheet with Demo Requests data</li>
              <li>Go to <strong>File → Share → Publish to web</strong></li>
              <li>In the dialog, select the specific sheet tab (not "Entire Document")</li>
              <li>Change the format from "Web page" to <strong>"Comma-separated values (.csv)"</strong></li>
              <li>Click <strong>"Publish"</strong> and copy the generated URL</li>
              <li>Repeat the same process for your Tasks sheet</li>
              <li>Paste both URLs in the fields below</li>
            </ol>
          </div>
          
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Important:</strong> Make sure to publish each sheet tab separately as CSV, not the entire document. 
              The CSV URLs should end with output=csv and be publicly accessible.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* CSV Format Requirements */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Demo Requests CSV Format
            </CardTitle>
            <CardDescription>
              Required columns in your Demo Requests spreadsheet
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="bg-blue-50 p-3 rounded-lg">
                <h5 className="font-medium text-sm mb-2">Required Columns (in order):</h5>
                <ol className="text-xs space-y-1 list-decimal list-inside">
                  <li><strong>Full Name</strong> - Client's complete name</li>
                  <li><strong>Phone Number</strong> - Client's mobile number</li>
                  <li><strong>Email</strong> - Client's email address</li>
                  <li><strong>Assignee</strong> - Presales team member (madhuri/salim/ronit)</li>
                  <li><strong>Sales Rep</strong> - Sales representative name</li>
                  <li><strong>Lead Status</strong> - demo_planned/demo_rescheduled/demo_cancelled/demo_given</li>
                  <li><strong>Demo Date</strong> - Date of the demo (YYYY-MM-DD)</li>
                </ol>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <h5 className="font-medium text-sm mb-2">Optional Columns:</h5>
                <ul className="text-xs space-y-1 list-disc list-inside">
                  <li>Demo Time - Time of demo (e.g., "10:00 AM")</li>
                  <li>Recipes - Comma-separated recipe names</li>
                  <li>Notes - Additional information</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Workflow Logic
            </CardTitle>
            <CardDescription>
              How the system handles different lead statuses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="border-l-4 border-blue-500 pl-3">
                <strong>demo_planned:</strong> Shows in presales calendar, they can add recipes. Visible to sales rep and appears in head chef's pending requests.
              </div>
              <div className="border-l-4 border-yellow-500 pl-3">
                <strong>demo_rescheduled:</strong> Updates date in all calendars, notifies kitchen team to reschedule, shows reschedule status to all users.
              </div>
              <div className="border-l-4 border-red-500 pl-3">
                <strong>demo_cancelled:</strong> Removes from all calendars and schedules.
              </div>
              <div className="border-l-4 border-green-500 pl-3">
                <strong>demo_given:</strong> Shows in Vijay's dashboard for media processing workflow.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Demo Requests CSV</CardTitle>
            <CardDescription>
              CSV URL for your demo requests data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="demo-csv-url">Demo Requests CSV URL</Label>
              <Input
                id="demo-csv-url"
                type="url"
                placeholder="https://docs.google.com/spreadsheets/d/your-sheet-id/export?format=csv&gid=sheet-id"
                value={demoRequestsCsvUrl}
                onChange={(e) => setDemoRequestsCsvUrl(e.target.value)}
              />
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleTestCsvUrl(demoRequestsCsvUrl, 'demo')}
              className="w-full"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Test Demo Requests CSV
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tasks CSV</CardTitle>
            <CardDescription>
              CSV URL for your tasks data (optional, can use existing format)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tasks-csv-url">Tasks CSV URL</Label>
              <Input
                id="tasks-csv-url"
                type="url"
                placeholder="https://docs.google.com/spreadsheets/d/your-sheet-id/export?format=csv&gid=sheet-id"
                value={tasksCsvUrl}
                onChange={(e) => setTasksCsvUrl(e.target.value)}
              />
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleTestCsvUrl(tasksCsvUrl, 'tasks')}
              className="w-full"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Test Tasks CSV
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Validation Messages */}
      {validationError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{validationError}</AlertDescription>
        </Alert>
      )}

      {validationSuccess && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{validationSuccess}</AlertDescription>
        </Alert>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        <Button
          onClick={handleValidateAndSave}
          disabled={isValidating}
          className="flex-1"
        >
          {isValidating ? 'Validating...' : 'Save CSV Configuration'}
        </Button>
        
        {currentConfig?.isValid && (
          <Button
            variant="outline"
            onClick={() => onConfigUpdate({
              demoRequestsCsvUrl: '',
              tasksCsvUrl: '',
              isValid: false
            })}
          >
            Clear Configuration
          </Button>
        )}
      </div>

      {/* Current Configuration Status */}
      {currentConfig?.isValid && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Current Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-sm">
              <strong>Demo Requests:</strong> {currentConfig.demoRequestsCsvUrl}
            </div>
            <div className="text-sm">
              <strong>Tasks:</strong> {currentConfig.tasksCsvUrl}
            </div>
            {currentConfig.lastUpdated && (
              <div className="text-xs text-muted-foreground">
                Last updated: {new Date(currentConfig.lastUpdated).toLocaleString()}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}