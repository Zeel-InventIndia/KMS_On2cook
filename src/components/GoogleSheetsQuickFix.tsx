import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { 
  ExternalLink, 
  CheckCircle, 
  AlertTriangle, 
  RefreshCw,
  Share,
  Shield,
  Clock
} from 'lucide-react';

interface GoogleSheetsQuickFixProps {
  onTestComplete?: (success: boolean) => void;
}

export function GoogleSheetsQuickFix({ onTestComplete }: GoogleSheetsQuickFixProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isTestingAccess, setIsTestingAccess] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  const steps = [
    {
      title: 'Open Google Sheet',
      description: 'Click to open the On2Cook spreadsheet in a new tab',
      action: () => window.open('https://docs.google.com/spreadsheets/d/1voRSFvWZiksr568KeUzfAZkCl7hDocya7jM1qstfmsM', '_blank'),
      buttonText: 'Open Sheet',
      icon: <ExternalLink className="h-4 w-4" />
    },
    {
      title: 'Click Share Button',
      description: 'In the Google Sheet, click the "Share" button in the top-right corner',
      action: () => {},
      buttonText: 'I\'ve clicked Share',
      icon: <Share className="h-4 w-4" />
    },
    {
      title: 'Change General Access',
      description: 'Under "General access", select "Anyone with the link"',
      action: () => {},
      buttonText: 'Set to Anyone with Link',
      icon: <Shield className="h-4 w-4" />
    },
    {
      title: 'Set Permission Level',
      description: 'Make sure the permission level is set to "Viewer"',
      action: () => {},
      buttonText: 'Set to Viewer',
      icon: <Shield className="h-4 w-4" />
    },
    {
      title: 'Save Changes',
      description: 'Click "Done" to save the sharing settings',
      action: () => {},
      buttonText: 'Changes Saved',
      icon: <CheckCircle className="h-4 w-4" />
    }
  ];

  const handleStepAction = (stepIndex: number) => {
    const step = steps[stepIndex];
    step.action();
    
    if (stepIndex < steps.length - 1) {
      setCurrentStep(stepIndex + 1);
    } else {
      // Last step completed, run test
      testSheetAccess();
    }
  };

  const testSheetAccess = async () => {
    setIsTestingAccess(true);
    setTestResult(null);

    try {
      // Test multiple URL formats
      const testUrls = [
        'https://docs.google.com/spreadsheets/d/1voRSFvWZiksr568KeUzfAZkCl7hDocya7jM1qstfmsM/export?format=csv&gid=964863455',
        'https://docs.google.com/spreadsheets/d/1voRSFvWZiksr568KeUzfAZkCl7hDocya7jM1qstfmsM/export?format=csv&gid=0'
      ];

      let accessWorking = false;
      for (const url of testUrls) {
        try {
          const response = await fetch(url, {
            method: 'HEAD',
            signal: AbortSignal.timeout(10000)
          });
          
          if (response.ok) {
            accessWorking = true;
            break;
          }
        } catch (error) {
          console.log('Test failed for URL:', url, error);
        }
      }

      setTestResult(accessWorking ? 'success' : 'error');
      onTestComplete?.(accessWorking);
    } catch (error) {
      console.error('Access test failed:', error);
      setTestResult('error');
      onTestComplete?.(false);
    } finally {
      setIsTestingAccess(false);
    }
  };

  const resetWizard = () => {
    setCurrentStep(0);
    setTestResult(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Share className="h-5 w-5 text-blue-600" />
          Google Sheets Permission Fix
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="border-blue-200 bg-blue-50">
          <AlertTriangle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-700">
            <strong>Quick Fix:</strong> Follow these steps to fix Google Sheets access permissions.
            This will resolve the "Page not found" errors.
          </AlertDescription>
        </Alert>

        {/* Step Progress */}
        <div className="space-y-3">
          {steps.map((step, index) => (
            <div 
              key={index}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                index === currentStep 
                  ? 'border-blue-200 bg-blue-50' 
                  : index < currentStep 
                    ? 'border-green-200 bg-green-50'
                    : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                index < currentStep 
                  ? 'bg-green-600 text-white' 
                  : index === currentStep 
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-300 text-gray-600'
              }`}>
                {index < currentStep ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>
              
              <div className="flex-1">
                <h4 className={`font-medium ${
                  index === currentStep ? 'text-blue-800' : 
                  index < currentStep ? 'text-green-800' : 'text-gray-600'
                }`}>
                  {step.title}
                </h4>
                <p className={`text-sm ${
                  index === currentStep ? 'text-blue-700' : 
                  index < currentStep ? 'text-green-700' : 'text-gray-600'
                }`}>
                  {step.description}
                </p>
              </div>
              
              {index === currentStep && (
                <Button
                  onClick={() => handleStepAction(index)}
                  size="sm"
                  className="flex items-center gap-2"
                >
                  {step.icon}
                  {step.buttonText}
                </Button>
              )}
            </div>
          ))}
        </div>

        {/* Test Results */}
        {isTestingAccess && (
          <Alert className="border-blue-200 bg-blue-50">
            <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />
            <AlertDescription className="text-blue-700">
              Testing Google Sheets access...
            </AlertDescription>
          </Alert>
        )}

        {testResult === 'success' && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700">
              <strong>Success!</strong> Google Sheets is now accessible. The "Page not found" errors should be resolved.
            </AlertDescription>
          </Alert>
        )}

        {testResult === 'error' && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-700">
              <strong>Still not working:</strong> Please double-check the sharing settings. 
              Make sure "Anyone with the link" is selected and permission is "Viewer".
              <div className="mt-2">
                <Button variant="outline" size="sm" onClick={resetWizard}>
                  Try Again
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Quick Actions */}
        <div className="flex items-center gap-2 pt-4 border-t">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.open('https://docs.google.com/spreadsheets/d/1voRSFvWZiksr568KeUzfAZkCl7hDocya7jM1qstfmsM', '_blank')}
          >
            <ExternalLink className="h-4 w-4 mr-1" />
            Open Sheet
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={testSheetAccess}
            disabled={isTestingAccess}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${isTestingAccess ? 'animate-spin' : ''}`} />
            Test Access
          </Button>
          {currentStep > 0 && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={resetWizard}
            >
              <Clock className="h-4 w-4 mr-1" />
              Start Over
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}