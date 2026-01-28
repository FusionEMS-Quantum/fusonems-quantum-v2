"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AgencyOnboarding from '@/components/agency/AgencyOnboarding';

export default function OnboardingPage() {
  const router = useRouter();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    // Check if onboarding has been completed
    const onboardingComplete = localStorage.getItem('agency_onboarding_complete');
    
    if (!onboardingComplete) {
      setShowOnboarding(true);
    } else {
      // Already completed, redirect to agency portal
      router.push('/agency');
    }
  }, [router]);

  const handleOnboardingComplete = () => {
    // Mark onboarding as complete
    localStorage.setItem('agency_onboarding_complete', 'true');
    localStorage.setItem('agency_onboarding_completed_at', new Date().toISOString());
    
    // Redirect to agency portal
    router.push('/agency');
  };

  if (!showOnboarding) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return <AgencyOnboarding onComplete={handleOnboardingComplete} />;
}
