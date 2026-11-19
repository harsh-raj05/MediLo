/**
 * MediLo Clinical Safety & Drug Interaction Rules Engine
 * Provides real-time clinical decision support (CDS) for pharmacists & patients:
 * - Duplicate therapeutic class & molecule detection (overdose prevention)
 * - Known drug-drug interaction cautions (spacing & contraindications)
 * - Administration directions & food advisories
 */

export const analyzeCartSafety = (items = []) => {
  if (!items || items.length === 0) {
    return { alerts: [], tips: [], hasSevere: false };
  }

  const alerts = [];
  const tips = [];

  const lowerNames = items.map((i) => ({
    id: i.medicineId,
    name: (i.name || '').toLowerCase(),
    generic: (i.genericName || i.name || '').toLowerCase(),
    category: (i.categoryName || '').toLowerCase(),
    raw: i,
  }));

  // 1. Check for Duplicate Painkillers / Analgesic Molecules
  const analgesics = lowerNames.filter(
    (m) =>
      m.generic.includes('acetolamide') ||
      m.generic.includes('paracetamol') ||
      m.generic.includes('ibuprofen') ||
      m.name.includes('calm') ||
      m.name.includes('pain') ||
      m.category.includes('analgesic') ||
      m.category.includes('fever')
  );

  if (analgesics.length > 1) {
    alerts.push({
      id: 'dup-analgesic',
      severity: 'WARNING',
      title: 'Duplicate Analgesic / Antipyretic Therapy',
      description: `Cart contains ${analgesics.length} pain/fever medicines (${analgesics.map((a) => a.raw.name).join(', ')}).`,
      recommendation:
        'Verify total 24-hour paracetamol/analgesic dosage does not exceed 4,000mg to prevent hepatic strain.',
    });
  }

  // 2. Check for Duplicate Allergy / Antihistamine Medicines
  const antihistamines = lowerNames.filter(
    (m) =>
      m.generic.includes('cetrizolene') ||
      m.generic.includes('cetirizine') ||
      m.generic.includes('loratadine') ||
      m.name.includes('allershield') ||
      m.category.includes('allergy') ||
      m.category.includes('sinus')
  );

  if (antihistamines.length > 1) {
    alerts.push({
      id: 'dup-allergy',
      severity: 'WARNING',
      title: 'Multiple Antihistamines Selected',
      description: `Cart contains multiple allergy formulations (${antihistamines.map((a) => a.raw.name).join(', ')}).`,
      recommendation:
        'Concurrent usage may cause additive drowsiness and dry mouth. One daily formulation is typically sufficient.',
    });
  }

  // 3. Antibiotic + Antacid / Proton Pump Inhibitor Spacing Interaction
  const hasAntibiotic = lowerNames.some(
    (m) =>
      m.generic.includes('amoxicilox') ||
      m.generic.includes('amoxicillin') ||
      m.generic.includes('antibiotic') ||
      m.name.includes('amoxi') ||
      m.category.includes('antibiotic')
  );

  const hasAntacid = lowerNames.some(
    (m) =>
      m.generic.includes('pantopranil') ||
      m.generic.includes('pantoprazole') ||
      m.generic.includes('antacid') ||
      m.name.includes('gastro') ||
      m.category.includes('digestive')
  );

  if (hasAntibiotic && hasAntacid) {
    alerts.push({
      id: 'interact-antibiotic-antacid',
      severity: 'MODERATE',
      title: 'Antibiotic & Antacid Administration Spacing',
      description: 'Gastric acid suppressors / antacids can reduce the bioavailability and absorption rate of oral antibiotics.',
      recommendation:
        'Advise patient to take the antacid at least 2 hours before or 2 hours after administering the antibiotic.',
    });
  }

  // 4. Cough Formulation + Sedative Caution
  const hasCoughSedative = lowerNames.some(
    (m) =>
      m.generic.includes('dextromethil') ||
      m.generic.includes('dextromethorphan') ||
      m.name.includes('cough') ||
      m.category.includes('respiratory')
  );

  if (hasCoughSedative && antihistamines.length > 0) {
    alerts.push({
      id: 'interact-cough-allergy',
      severity: 'INFO',
      title: 'Additive Drowsiness Caution',
      description: 'Cough suppressants combined with antihistamines can cause mild CNS sedation and drowsiness.',
      recommendation:
        'Counsel patient to exercise caution when driving motor vehicles or operating heavy mechanical machinery.',
    });
  }

  // General helpful clinical tips based on cart items
  lowerNames.forEach((m) => {
    if (m.category.includes('antibiotic') || m.generic.includes('amoxicilox')) {
      tips.push({
        medicine: m.raw.name,
        guidance: 'Counsel patient to complete the entire course as prescribed even if symptoms resolve early.',
      });
    } else if (m.category.includes('digestive') || m.generic.includes('pantopranil')) {
      tips.push({
        medicine: m.raw.name,
        guidance: 'Best taken first thing in the morning 30 minutes before breakfast with a glass of water.',
      });
    } else if (m.category.includes('analgesic') || m.name.includes('calm')) {
      tips.push({
        medicine: m.raw.name,
        guidance: 'Take post-meals with water to minimize gastric irritation.',
      });
    }
  });

  const hasSevere = alerts.some((a) => a.severity === 'CRITICAL' || a.severity === 'WARNING');

  return { alerts, tips, hasSevere };
};

/**
 * Standard Indian dosage instruction helper for tax invoice printing
 */
export const getDosageDirections = (medicineName = '') => {
  const n = medicineName.toLowerCase();
  if (n.includes('gastro') || n.includes('pantopranil')) {
    return {
      dosage: '1 Capsule Daily',
      timing: 'Morning (Empty Stomach, 30m before breakfast)',
      refillCycleDays: 15,
    };
  }
  if (n.includes('allershield') || n.includes('cetrizolene')) {
    return {
      dosage: '1 Tablet Daily',
      timing: 'Night before bedtime',
      refillCycleDays: 10,
    };
  }
  if (n.includes('amoxi') || n.includes('antibiotic')) {
    return {
      dosage: '1 Tablet Twice Daily (Every 12 hours)',
      timing: 'Post meals with water (Complete course)',
      refillCycleDays: 5,
    };
  }
  if (n.includes('cough') || n.includes('syrup')) {
    return {
      dosage: '10ml Thrice Daily',
      timing: 'After meals as needed for throat irritation',
      refillCycleDays: 7,
    };
  }
  return {
    dosage: '1 Tablet as prescribed',
    timing: 'Post meals with water',
    refillCycleDays: 10,
  };
};
