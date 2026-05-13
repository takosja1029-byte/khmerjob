export enum JobType {
  FULL_TIME = 'Full-time',
  PART_TIME = 'Part-time',
  CONTRACT = 'Contract',
  REMOTE = 'Remote',
}

export enum Category {
  DEVELOPMENT = 'Development',
  DESIGN = 'Design',
  MARKETING = 'Marketing',
  SALES = 'Sales',
  CUSTOMER_SERVICE = 'Customer Service',
}

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  type: JobType;
  logo: string;
  category: Category;
  postedAt: string;
  urgent: boolean;
  description: string;
  companyId?: string;
  companySize?: string;
}

export interface Company {
  id: string;
  name: string;
  logo: string;
  industry: string;
  website: string;
  size: string;
  founded: string;
  location: string;
  description: string;
  benefits: string[];
}

export interface Application {
  id?: string;
  candidateName: string;
  candidateEmail: string;
  jobId: string;
  jobTitle: string;
  company: string;
  status: 'pending' | 'reviewed' | 'rejected' | 'accepted';
  createdAt: string;
}
