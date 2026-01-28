import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../App'
import { checkout } from '../lib/api'
import type { CheckoutState, RigCheckItem, EquipmentItem, InventoryItem, ControlledSubstance } from '../types'
import RigCheckStep from '../components/RigCheckStep'
import EquipmentStep from '../components/EquipmentStep'
import InventoryStep from '../components/InventoryStep'
import NarcoticsStep from '../components/NarcoticsStep'

const steps = [
  { id: 'rig-check', label: 'Rig Check', icon: '1' },
  { id: 'equipment', label: 'Equipment', icon: '2' },
  { id: 'inventory', label: 'Inventory', icon: '3' },
  { id: 'narcotics', label: 'Narcotics', icon: '4' },
] as const

export default function Checkout() {
  const navigate = useNavigate()
  const { setCheckoutComplete } = useApp()
  const [currentStep, setCurrentStep] = useState(0)
  const [loading, setLoading] = useState(true)
  const [unitId] = useState(() => localStorage.getItem('unitId') || 'UNIT-001')
  const [shiftId] = useState(() => localStorage.getItem('shiftId') || new Date().toISOString().slice(0, 10))

  const [checkoutState, setCheckoutState] = useState<CheckoutState>({
    step: 'rig-check',
    unitId,
    shiftId,
    crewMembers: [],
    rigCheck: { items: [] },
    equipment: { items: [] },
    inventory: { items: [], discrepancies: [] },
    narcotics: { substances: [] },
  })

  useEffect(() => {
    loadCheckoutData()
  }, [unitId])

  const loadCheckoutData = async () => {
    setLoading(true)
    try {
      const [rigRes, equipRes, invRes, narcRes] = await Promise.all([
        checkout.getRigCheckItems(unitId),
        checkout.getEquipmentItems(unitId),
        checkout.getInventoryItems(unitId),
        checkout.getControlledSubstances(unitId),
      ])
      setCheckoutState((prev) => ({
        ...prev,
        rigCheck: { items: rigRes.data },
        equipment: { items: equipRes.data },
        inventory: { items: invRes.data, discrepancies: [] },
        narcotics: { substances: narcRes.data },
      }))
    } catch (err) {
      console.error('Failed to load checkout data:', err)
      setCheckoutState((prev) => ({
        ...prev,
        rigCheck: { items: generateMockRigItems() },
        equipment: { items: generateMockEquipment() },
        inventory: { items: generateMockInventory(), discrepancies: [] },
        narcotics: { substances: generateMockNarcotics() },
      }))
    } finally {
      setLoading(false)
    }
  }

  const handleRigCheckComplete = (items: RigCheckItem[], signature: string) => {
    setCheckoutState((prev) => ({
      ...prev,
      rigCheck: { items, completedAt: new Date().toISOString(), signature },
      step: 'equipment',
    }))
    setCurrentStep(1)
  }

  const handleEquipmentComplete = (items: EquipmentItem[]) => {
    setCheckoutState((prev) => ({
      ...prev,
      equipment: { items, completedAt: new Date().toISOString() },
      step: 'inventory',
    }))
    setCurrentStep(2)
  }

  const handleInventoryComplete = (items: InventoryItem[], discrepancies: string[]) => {
    setCheckoutState((prev) => ({
      ...prev,
      inventory: { items, completedAt: new Date().toISOString(), discrepancies },
      step: 'narcotics',
    }))
    setCurrentStep(3)
  }

  const handleNarcoticsComplete = async (
    substances: ControlledSubstance[],
    primarySig: string,
    witnessSig: string,
    witnessName: string
  ) => {
    const finalState: CheckoutState = {
      ...checkoutState,
      narcotics: {
        substances,
        completedAt: new Date().toISOString(),
        primarySignature: primarySig,
        witnessSignature: witnessSig,
        witnessName,
      },
      step: 'complete',
    }
    try {
      await checkout.submitCheckout(finalState)
    } catch (err) {
      console.error('Failed to submit checkout:', err)
    }
    localStorage.setItem('checkoutComplete', 'true')
    localStorage.setItem('checkoutTimestamp', new Date().toISOString())
    setCheckoutComplete(true)
    navigate('/dashboard')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-400">Loading checkout data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Daily Checkout - {unitId}</h1>
          <span className="text-gray-400">{new Date().toLocaleDateString()}</span>
        </div>
        <nav className="flex mt-4 gap-2">
          {steps.map((step, idx) => (
            <button
              key={step.id}
              onClick={() => idx <= currentStep && setCurrentStep(idx)}
              disabled={idx > currentStep}
              className={`flex-1 py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors ${
                idx === currentStep
                  ? 'bg-blue-600 text-white'
                  : idx < currentStep
                  ? 'bg-green-700 text-white'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }`}
            >
              <span className="w-6 h-6 rounded-full bg-current/20 flex items-center justify-center text-sm">
                {idx < currentStep ? '\u2713' : step.icon}
              </span>
              <span className="font-medium">{step.label}</span>
            </button>
          ))}
        </nav>
      </header>

      <main className="p-6">
        {currentStep === 0 && (
          <RigCheckStep
            items={checkoutState.rigCheck.items}
            onComplete={handleRigCheckComplete}
          />
        )}
        {currentStep === 1 && (
          <EquipmentStep
            items={checkoutState.equipment.items}
            onComplete={handleEquipmentComplete}
            onBack={() => setCurrentStep(0)}
          />
        )}
        {currentStep === 2 && (
          <InventoryStep
            items={checkoutState.inventory.items}
            onComplete={handleInventoryComplete}
            onBack={() => setCurrentStep(1)}
          />
        )}
        {currentStep === 3 && (
          <NarcoticsStep
            substances={checkoutState.narcotics.substances}
            onComplete={handleNarcoticsComplete}
            onBack={() => setCurrentStep(2)}
          />
        )}
      </main>
    </div>
  )
}

function generateMockRigItems(): RigCheckItem[] {
  return [
    { id: '1', category: 'Cab', name: 'Emergency Lights', location: 'Exterior', required: true, status: 'unchecked' },
    { id: '2', category: 'Cab', name: 'Siren', location: 'Exterior', required: true, status: 'unchecked' },
    { id: '3', category: 'Cab', name: 'Horn', location: 'Cab', required: true, status: 'unchecked' },
    { id: '4', category: 'Cab', name: 'Mirrors', location: 'Exterior', required: true, status: 'unchecked' },
    { id: '5', category: 'Cab', name: 'Windshield Wipers', location: 'Exterior', required: true, status: 'unchecked' },
    { id: '6', category: 'Safety', name: 'Fire Extinguisher', location: 'Cab', required: true, status: 'unchecked' },
    { id: '7', category: 'Safety', name: 'Reflective Triangles', location: 'Side Compartment', required: true, status: 'unchecked' },
    { id: '8', category: 'Patient', name: 'Stretcher Locks', location: 'Patient Compartment', required: true, status: 'unchecked' },
    { id: '9', category: 'Patient', name: 'Stretcher Rails', location: 'Patient Compartment', required: true, status: 'unchecked' },
    { id: '10', category: 'Patient', name: 'Seat Belts', location: 'Patient Compartment', required: true, status: 'unchecked' },
    { id: '11', category: 'Patient', name: 'Suction Unit', location: 'Airway Cabinet', required: true, status: 'unchecked' },
    { id: '12', category: 'Patient', name: 'O2 System', location: 'Onboard', required: true, status: 'unchecked' },
  ]
}

function generateMockEquipment(): EquipmentItem[] {
  return [
    { id: '1', name: 'Cardiac Monitor', serialNumber: 'LP15-001234', category: 'Monitoring', location: 'Main Cabinet', status: 'operational', batteryLevel: 95 },
    { id: '2', name: 'AED', serialNumber: 'AED-005678', category: 'Resuscitation', location: 'Airway Cabinet', status: 'operational', batteryLevel: 100 },
    { id: '3', name: 'Pulse Oximeter', serialNumber: 'SPO2-002345', category: 'Monitoring', location: 'Vitals Bag', status: 'operational', batteryLevel: 80 },
    { id: '4', name: 'Glucometer', serialNumber: 'GLU-003456', category: 'Monitoring', location: 'Vitals Bag', status: 'operational' },
    { id: '5', name: 'Suction Unit (Portable)', serialNumber: 'SUC-004567', category: 'Airway', location: 'Airway Bag', status: 'operational', batteryLevel: 70 },
    { id: '6', name: 'IV Pump', serialNumber: 'IVP-005678', category: 'IV Therapy', location: 'IV Cabinet', status: 'operational', batteryLevel: 85 },
  ]
}

function generateMockInventory(): InventoryItem[] {
  return [
    { id: '1', name: 'Saline 1000ml', sku: 'SAL-1000', category: 'IV Fluids', location: 'IV Cabinet', parLevel: 6, currentQuantity: 6, reorderPoint: 2 },
    { id: '2', name: 'Saline 500ml', sku: 'SAL-500', category: 'IV Fluids', location: 'IV Cabinet', parLevel: 4, currentQuantity: 4, reorderPoint: 2 },
    { id: '3', name: 'IV Start Kit', sku: 'IVK-001', category: 'IV Supplies', location: 'IV Cabinet', parLevel: 10, currentQuantity: 8, reorderPoint: 4 },
    { id: '4', name: '18ga IV Catheter', sku: 'IVC-18', category: 'IV Supplies', location: 'IV Cabinet', parLevel: 10, currentQuantity: 10, reorderPoint: 4 },
    { id: '5', name: '20ga IV Catheter', sku: 'IVC-20', category: 'IV Supplies', location: 'IV Cabinet', parLevel: 10, currentQuantity: 9, reorderPoint: 4 },
    { id: '6', name: 'NRB Mask Adult', sku: 'NRB-A', category: 'Oxygen', location: 'Airway Cabinet', parLevel: 4, currentQuantity: 4, reorderPoint: 2 },
    { id: '7', name: 'Nasal Cannula', sku: 'NC-001', category: 'Oxygen', location: 'Airway Cabinet', parLevel: 6, currentQuantity: 5, reorderPoint: 2 },
    { id: '8', name: 'BVM Adult', sku: 'BVM-A', category: 'Airway', location: 'Airway Bag', parLevel: 2, currentQuantity: 2, reorderPoint: 1 },
    { id: '9', name: 'OPA Set', sku: 'OPA-001', category: 'Airway', location: 'Airway Bag', parLevel: 2, currentQuantity: 2, reorderPoint: 1 },
    { id: '10', name: 'Bandage 4x4', sku: 'BND-4X4', category: 'Trauma', location: 'Trauma Bag', parLevel: 20, currentQuantity: 18, reorderPoint: 8 },
  ]
}

function generateMockNarcotics(): ControlledSubstance[] {
  return [
    { id: '1', name: 'Fentanyl', deaSchedule: 'II', concentration: '100mcg/2ml', quantity: 2, expectedQuantity: 2, sealIntact: true, lotNumber: 'FEN-2024-001', expirationDate: '2025-06-30' },
    { id: '2', name: 'Morphine', deaSchedule: 'II', concentration: '10mg/ml', quantity: 2, expectedQuantity: 2, sealIntact: true, lotNumber: 'MOR-2024-002', expirationDate: '2025-08-15' },
    { id: '3', name: 'Midazolam', deaSchedule: 'IV', concentration: '5mg/ml', quantity: 4, expectedQuantity: 4, sealIntact: true, lotNumber: 'MID-2024-003', expirationDate: '2025-09-30' },
    { id: '4', name: 'Ketamine', deaSchedule: 'III', concentration: '500mg/10ml', quantity: 2, expectedQuantity: 2, sealIntact: true, lotNumber: 'KET-2024-004', expirationDate: '2025-07-31' },
  ]
}
