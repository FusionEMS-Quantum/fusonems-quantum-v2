"use client";

import { useState } from 'react';
import { CheckCircle, Eye, XCircle, FileText, HelpCircle } from 'lucide-react';

interface AgencyOnboardingProps {
  onComplete: () => void;
}

export default function AgencyOnboarding({ onComplete }: AgencyOnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: "Welcome to Your Agency Portal",
      icon: <CheckCircle className="w-12 h-12 text-blue-500" />,
      content: (
        <div className="space-y-4">
          <p className="text-lg">
            This portal gives your agency clear, read-only visibility into incidents, documentation, and claim progress handled on your behalf.
          </p>
          <p className="text-lg font-medium">You can use this portal to:</p>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li>See the status of each incident and claim</li>
            <li>Confirm which documents are required or complete</li>
            <li>Understand where a claim is in the process</li>
            <li>View payments and balances</li>
            <li>Communicate securely when questions arise</li>
          </ul>
        </div>
      )
    },
    {
      title: "What This Portal Is",
      icon: <Eye className="w-12 h-12 text-green-500" />,
      content: (
        <div className="space-y-4">
          <p className="text-lg">
            This portal is designed to keep you informed without requiring you to manage billing tasks directly.
          </p>
          <p className="text-lg font-medium">You'll always see:</p>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li>What's happening</li>
            <li>What's needed</li>
            <li>Whether your agency needs to take action</li>
          </ul>
        </div>
      )
    },
    {
      title: "What This Portal Is Not",
      icon: <XCircle className="w-12 h-12 text-amber-500" />,
      content: (
        <div className="space-y-4">
          <p className="text-lg font-medium">This portal does not allow:</p>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li>Editing claims</li>
            <li>Submitting billing actions</li>
            <li>Managing collections</li>
            <li>Viewing internal billing strategy or compliance logic</li>
          </ul>
          <p className="text-lg mt-4">
            These protections exist to ensure accuracy, consistency, and compliance.
          </p>
        </div>
      )
    },
    {
      title: "About Documentation & Fax",
      icon: <FileText className="w-12 h-12 text-purple-500" />,
      content: (
        <div className="space-y-4">
          <p className="text-lg">
            When documentation is missing, our system may request it directly from facilities, physician offices, or payers using secure methods such as fax.
          </p>
          <p className="text-lg">
            You'll see the status of those requests so you know what's pending — without needing to follow up manually.
          </p>
        </div>
      )
    },
    {
      title: "Support Expectation",
      icon: <HelpCircle className="w-12 h-12 text-indigo-500" />,
      content: (
        <div className="space-y-4">
          <p className="text-lg">
            If something requires your agency's involvement, it will be clearly labeled.
          </p>
          <p className="text-lg">
            If no action is required, no action is expected.
          </p>
        </div>
      )
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-8">
          {/* Progress Indicator */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-2">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`flex-1 h-2 mx-1 rounded-full transition-colors ${
                    index <= currentStep ? 'bg-blue-500' : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
            <p className="text-sm text-gray-500 text-center">
              Step {currentStep + 1} of {steps.length}
            </p>
          </div>

          {/* Step Content */}
          <div className="text-center mb-6">
            <div className="flex justify-center mb-4">
              {steps[currentStep].icon}
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {steps[currentStep].title}
            </h2>
            <div className="text-left">
              {steps[currentStep].content}
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between items-center mt-8 pt-6 border-t">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className={`px-6 py-2 rounded-lg transition-colors ${
                currentStep === 0
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Previous
            </button>
            <button
              onClick={handleNext}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {currentStep === steps.length - 1 ? 'Get Started' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
