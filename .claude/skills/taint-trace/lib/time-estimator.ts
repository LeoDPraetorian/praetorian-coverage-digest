// time-estimator.ts
export interface TimeEstimate {
  seconds: number;
  message: string;
}

export function estimateAnalysisTime(binarySizeBytes: number): TimeEstimate {
  const KB = 1024;
  const MB = 1024 * KB;

  if (binarySizeBytes < 500 * KB) {
    return {
      seconds: 30,
      message: 'This will take ~30 seconds. Continue? (yes/no)'
    };
  } else if (binarySizeBytes < 5 * MB) {
    return {
      seconds: 300, // 5 minutes
      message: 'This will take ~5 minutes. Continue? (yes/no)'
    };
  } else {
    return {
      seconds: 900, // 15 minutes
      message: 'This will take ~15+ minutes. Continue? (yes/no)'
    };
  }
}
