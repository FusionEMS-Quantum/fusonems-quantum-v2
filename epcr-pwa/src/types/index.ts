export type CheckoutStep = 'rig-check' | 'equipment' | 'inventory' | 'narcotics' | 'complete'

export type EpcrStatus = 'draft' | 'in_progress' | 'complete' | 'locked' | 'submitted'

export interface NEMSISTimestamps {
  psapCall?: string
  dispatch?: string
  enRoute?: string
  onScene?: string
  atPatient?: string
  leftScene?: string
  atDestination?: string
  transferCare?: string
  inService?: string
  cancelled?: string
}

export interface RigCheckItem {
  id: string
  category: string
  name: string
  location: string
  required: boolean
  lastChecked?: string
  checkedBy?: string
  status: 'pass' | 'fail' | 'needs_attention' | 'unchecked'
  notes?: string
}

export interface EquipmentItem {
  id: string
  name: string
  serialNumber: string
  category: string
  location: string
  lastCalibration?: string
  nextCalibration?: string
  status: 'operational' | 'needs_service' | 'out_of_service'
  batteryLevel?: number
}

export interface InventoryItem {
  id: string
  name: string
  sku: string
  category: string
  location: string
  parLevel: number
  currentQuantity: number
  expirationDate?: string
  lotNumber?: string
  reorderPoint: number
}

export interface ControlledSubstance {
  id: string
  name: string
  deaSchedule: 'II' | 'III' | 'IV' | 'V'
  concentration: string
  quantity: number
  expectedQuantity: number
  sealIntact: boolean
  lotNumber: string
  expirationDate: string
  lastVerified?: string
  verifiedBy?: string
  witnessName?: string
}

export interface CheckoutState {
  step: CheckoutStep
  unitId: string
  shiftId: string
  crewMembers: string[]
  rigCheck: {
    items: RigCheckItem[]
    completedAt?: string
    signature?: string
  }
  equipment: {
    items: EquipmentItem[]
    completedAt?: string
  }
  inventory: {
    items: InventoryItem[]
    completedAt?: string
    discrepancies: string[]
  }
  narcotics: {
    substances: ControlledSubstance[]
    completedAt?: string
    primarySignature?: string
    witnessSignature?: string
    witnessName?: string
  }
}

export interface Patient {
  id: string
  firstName: string
  lastName: string
  middleName?: string
  dateOfBirth?: string
  age?: number
  ageUnits?: 'years' | 'months' | 'days' | 'hours'
  gender?: 'male' | 'female' | 'other' | 'unknown'
  race?: string[]
  ethnicity?: string
  ssn?: string
  address?: {
    street: string
    city: string
    state: string
    zip: string
    county?: string
  }
  phone?: string
  email?: string
  emergencyContact?: {
    name: string
    relationship: string
    phone: string
  }
  weight?: number
  weightUnits?: 'kg' | 'lb'
  allergies?: string[]
  medicalHistory?: string[]
  currentMedications?: string[]
  dnrStatus?: 'none' | 'dnr' | 'dnr_comfort' | 'unknown'
  advanceDirectives?: string
  insurancePrimary?: {
    provider: string
    policyNumber: string
    groupNumber?: string
    subscriberName?: string
  }
  insuranceSecondary?: {
    provider: string
    policyNumber: string
    groupNumber?: string
  }
}

export interface VitalSet {
  id: string
  recordId: string
  timestamp: string
  takenBy: string
  bloodPressureSystolic?: number
  bloodPressureDiastolic?: number
  bloodPressureMethod?: 'auscultation' | 'palpation' | 'automated' | 'invasive'
  heartRate?: number
  heartRateMethod?: 'palpation' | 'auscultation' | 'monitor' | 'pulse_ox'
  pulseOximetry?: number
  pulseOximetryMethod?: 'pulse_ox' | 'co_ox'
  supplementalO2?: boolean
  o2FlowRate?: number
  o2Device?: string
  respiratoryRate?: number
  respiratoryEffort?: 'normal' | 'labored' | 'shallow' | 'agonal' | 'apneic'
  temperature?: number
  temperatureMethod?: 'oral' | 'rectal' | 'tympanic' | 'temporal' | 'axillary'
  temperatureUnits?: 'F' | 'C'
  bloodGlucose?: number
  bloodGlucoseMethod?: 'glucometer' | 'laboratory'
  gcsEye?: number
  gcsVerbal?: number
  gcsMotor?: number
  gcsTotal?: number
  gcsQualifier?: string
  painScale?: number
  painScaleType?: 'numeric' | 'wong_baker' | 'flacc'
  pupilLeft?: string
  pupilRight?: string
  pupilLeftReactivity?: 'reactive' | 'sluggish' | 'non_reactive' | 'unable'
  pupilRightReactivity?: 'reactive' | 'sluggish' | 'non_reactive' | 'unable'
  skinColor?: 'normal' | 'pale' | 'cyanotic' | 'flushed' | 'jaundiced' | 'mottled'
  skinTemperature?: 'normal' | 'hot' | 'cool' | 'cold'
  skinMoisture?: 'dry' | 'moist' | 'diaphoretic'
  capillaryRefill?: 'normal' | 'delayed' | 'absent'
  etco2?: number
  etco2Waveform?: boolean
  cardiacRhythm?: string
  strokeScale?: {
    type: 'cincinnati' | 'los_angeles' | 'nihss'
    score: number
    findings: string[]
  }
  notes?: string
}

export interface Assessment {
  id: string
  recordId: string
  chiefComplaint: string
  chiefComplaintOther?: string
  historyOfPresentIllness?: string
  providerPrimaryImpression?: string
  providerSecondaryImpression?: string[]
  possibleInjury?: string[]
  injuryLocation?: string[]
  injuryMechanism?: string
  traumaCriteria?: string[]
  medicalCardiacArrest?: {
    witnessed: boolean
    bystanderCpr: boolean
    aedUsedPrior: boolean
    initialRhythm: string
    rosc: boolean
    roscTime?: string
  }
  barriers?: string[]
  anatomicalFindings?: {
    region: string
    findings: string[]
    notes?: string
  }[]
  levelOfResponsiveness?: 'alert' | 'verbal' | 'painful' | 'unresponsive'
  mentalStatus?: string[]
  neurologicalAssessment?: {
    motorLeft: number
    motorRight: number
    sensoryLeft: string
    sensoryRight: string
  }
  assessmentTime: string
  assessedBy: string
}

export interface Intervention {
  id: string
  recordId: string
  procedure: string
  procedureOther?: string
  timestamp: string
  performedBy: string
  priorToArrival: boolean
  successful: boolean
  attempts?: number
  complications?: string[]
  responseToProcedure?: string
  deviceSize?: string
  deviceType?: string
  site?: string
  routeOfAdministration?: string
  notes?: string
  authorizations?: {
    type: 'online' | 'protocol' | 'standing_order'
    physician?: string
    time?: string
  }
}

export interface MedicationAdmin {
  id: string
  recordId: string
  medication: string
  dose: number
  doseUnits: string
  route: string
  timestamp: string
  administeredBy: string
  authorizedBy?: string
  authorizationType?: 'protocol' | 'online' | 'standing_order'
  response?: string
  responseTime?: string
  complications?: string[]
  contraindications?: string[]
  priorToArrival: boolean
  isControlled: boolean
  deaSchedule?: 'II' | 'III' | 'IV' | 'V'
  witnessName?: string
  witnessSignature?: string
  wasteAmount?: number
  wasteWitnessName?: string
  wasteWitnessSignature?: string
  lotNumber?: string
  notes?: string
}

export interface Narrative {
  id: string
  recordId: string
  type: 'primary' | 'addendum' | 'revision'
  content: string
  author: string
  timestamp: string
  signedAt?: string
  signature?: string
}

export interface DeviceData {
  deviceType: string
  extractedData: any
  confidence: number
  patientId: string
  timestamp: string
  confirmedBy?: string
}

export interface VentilatorSettings {
  mode: string
  breathRate: number
  tidalVolume: number
  fio2: number
  peep: number
  peakPressure?: number
  plateauPressure?: number
  timestamp: string
  recordedBy: string
}

export interface BloodProduct {
  id: string
  productType: 'rbc' | 'ffp' | 'platelets' | 'cryo' | 'whole_blood'
  bloodType: string
  unitId: string
  volume: number
  startTime: string
  endTime?: string
  administeredBy: string
  witnessedBy: string
  crossmatched: boolean
  complications?: string[]
}

export interface InfusionData {
  id: string
  medication: string
  concentration: string
  rate: number
  rateUnits: string
  startTime: string
  endTime?: string
  totalVolume: number
  pumpId?: string
}

export interface EpcrRecord {
  id: string
  incidentNumber: string
  status: EpcrStatus
  serviceType: 'medical_transport' | 'fire_911' | 'hems'
  unitId: string
  crewMembers: {
    id: string
    name: string
    role: 'driver' | 'attendant' | 'supervisor' | 'trainee'
    certLevel: string
  }[]
  dispatchInfo?: {
    callType: string
    priority: string
    dispatchCode?: string
    callerName?: string
    callerPhone?: string
    complaint: string
  }
  locationPickup?: {
    name?: string
    address: string
    city: string
    state: string
    zip: string
    locationType: string
    gps?: { lat: number; lng: number }
  }
  locationDestination?: {
    name?: string
    address: string
    city: string
    state: string
    zip: string
    facilityType?: string
    gps?: { lat: number; lng: number }
  }
  timestamps: NEMSISTimestamps
  patient?: Patient
  vitals: VitalSet[]
  assessment?: Assessment
  interventions: Intervention[]
  medications: MedicationAdmin[]
  narratives: Narrative[]
  signatures: {
    crew?: { name: string; signature: string; timestamp: string }
    patient?: { signature: string; timestamp: string; relationship?: string }
    witness?: { name: string; signature: string; timestamp: string }
    receivingFacility?: { name: string; signature: string; timestamp: string }
  }
  billing?: {
    levelOfService: string
    mileage: number
    supplies: { item: string; quantity: number; cost: number }[]
    priorAuthNumber?: string
    pcsForm?: boolean
  }
  createdAt: string
  updatedAt: string
  createdFrom?: 'crewlink' | 'manual' | 'cad_911'
  crewlinkTripId?: string
  cadIncidentId?: string
}
