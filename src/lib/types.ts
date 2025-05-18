export type Branch = 'Computer' | 'Electronic' | 'Civil' | 'Mechanical' | 'Electrical' | string; // Allow custom branches
export type YearOfStudy = 'FY' | 'SY' | 'TY';

export interface Student {
  id: string; // Unique identifier, matches barcode number
  name: string;
  branch: Branch;
  enrollNo?: string; // Changed from rollNo and made optional
  yearOfStudy?: YearOfStudy; // Made optional
  // Ensure idCardImageUri is part of the type, though it can be undefined
  idCardImageUri?: string; // Optional: Store the captured ID card image URI during registration
  createdAt: Date;
}

export type EntryType = 'Entry' | 'Exit';

export interface EntryLog {
  id: string; // Unique log entry ID
  studentId: string; // References Student.id
  studentName: string; // Denormalized for easier display
  branch: Branch; // Denormalized
  timestamp: Date;
  type: EntryType; // 'Entry' or 'Exit'
  // Optional: Add comparison result from scan time
  imageMatch?: boolean; // Added during processing
}

// Type for data extracted from barcode/ID card image
export interface ExtractedIdData {
  idNumber?: string;
  studentName?: string;
  branch?: string;
  enrollNo?: string;
}

// Type for admin credentials (used for demo login)
export interface AdminCredentials {
    username: string;
    password?: string; // Password might be handled differently in real auth
}
