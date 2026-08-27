// Defines the JSON shape Claude returns extracted data in
import Anthropic from '@anthropic-ai/sdk';
export const CV_EXTRACTION_TOOL_NAME = 'record_cv_data';

export const cvExtractionSchema: Anthropic.Tool = {
    name: CV_EXTRACTION_TOOL_NAME,
    description: 'Extracts structured data from a CV document: contact info, skills, experience, certifications, and education.',
    input_schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
            contact: {
                type: 'object',
                description: 'Contact and personal information extracted from the CV.',
                properties: {
                    fullName: { type: 'string'},
                    email: { type: 'string'},
                    phone: { type: 'string'},
                    nationality: { type: 'string'},
                    addressLine1: { type: 'string'},
                    addressLine2: { type: 'string'},
                    suburb: { type: 'string'},
                    city: { type: 'string'},
                    province: { type: 'string'},
                    postalCode: { type: 'string'},
                },
                required: [],
            },
            skills: {
                type: 'array',
                description: 'List of skills extracted from the CV, either explicitely mentioned or applied by role description.',
                items: {
                    type: 'object',
                    properties: {
                        skillName: { 
                            type: 'string',
                            description: 'The name of the skill, e.g., "JavaScript", normalised to a standard format.'
                        },
                        yearsExperience: { type: 'number',
                            description: 'The number of years of experience the candidate has with this skill, as inferred from the CV.'
                         },
                        competencyLevel: { type: 'string',
                            description: 'The level of competency the candidate has with this skill.',
                            enum: ['BEGINNER', 'INTERMEDIATE', 'EXPERT'] },
                        confidenceLevel: { type: 'number',
                            description: 'The confidence level of the extracted skill information, as inferred from the CV.'
                        },
                    },
                    required: ['skillName', 'yearsExperience', 'competencyLevel', 'confidenceLevel'],
                },
            },
            experiences: {
                type: 'array',
                description: 'List of work experiences extracted from the CV.',
                items: {
                    type: 'object',
                    properties: {
                        jobTitle: { type: 'string' },
                        companyName: { type: 'string' },
                        jobType: { 
                            type: 'string',
                            enum: ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'FREELANCE'],
                            description: 'The type of job the candidate held, as inferred from the CV. Defaults to FULL_TIME if not specified.'
                        },
                        workModel: { 
                            type: 'string', 
                            enum: ['ONSITE', 'REMOTE', 'HYBRID'],
                            description: 'The work model for the position, as inferred from the CV. Defaults to ONSITE if not specified.' 
                        },
                        startDate: { 
                            type: 'string',
                            description: 'The start date of the job, as inferred from the CV. Should be in YYYY-MM-DD format. If only month/year is given, use the first day of the month. If only year is given, use January 1st of that year.'
                         },
                        endDate: { 
                            type: 'string',
                            description: 'The end date of the job, as inferred from the CV. Should be in YYYY-MM-DD format. If only month/year is given, use the last day of the month. If only year is given, use December 31st of that year. Omit if the candidate is currently employed in this role.'
                        },
                        description: { type: 'string',
                            description: 'A brief description of the job responsibilities and achievements, as inferred from the CV. Condensed to a few sentences, focusing on the most relevant information.'
                        },
                    },
                    required: ['jobTitle', 'companyName', 'jobType', 'workModel', 'startDate', 'description'],
                },
            },
            certifications: {
                type: 'array',
                description: 'List of certifications, licenses or completed courses extracted from the CV.',
                items: {
                    type: 'object',
                    properties: {
                        title: { type: 'string' },
                        issuingBody: { type: 'string' },
                        startDate: { 
                            type: 'string',
                            description: 'The start date of the certification, as inferred from the CV. Should be in YYYY-MM-DD format. If only month/year is given, use the first day of the month. If only year is given, use January 1st of that year. Omit if not specified.'
                         },
                        endDate: { 
                            type: 'string',
                            description: 'The end date of the certification, as inferred from the CV. Should be in YYYY-MM-DD format. If only month/year is given, use the last day of the month. If only year is given, use December 31st of that year. Omit if not specified.'
                        },
                    },
                    required: ['title', 'issuingBody'],
                },
            },
            education: {
                type: 'array',
                description: 'List of educational qualifications extracted from the CV.',
                items: {
                    type: 'object',
                    properties: {
                        institution: { type: 'string' },
                        qualification: { type: 'string' },
                        fieldOfStudy: { type: 'string' },
                        startDate: {
                            type: 'string',
                            description: 'The start date of the education, as inferred from the CV. Should be in YYYY-MM-DD format. If only month/year is given, use the first day of the month. If only year is given, use January 1st of that year. Omit if not specified.'
                        },
                        endDate: { 
                            type: 'string',
                            description: 'The end date of the education, as inferred from the CV. Should be in YYYY-MM-DD format. If only month/year is given, use the last day of the month. If only year is given, use December 31st of that year. Omit if not specified.'
                        }
                    },
                    required: ['institution', 'qualification']
                },
            },
            confidenceScores: {
                type: 'object',
                description: 'Confidence scores for each section of the CV, as inferred from the CV, from 0 to 1, where 1 is the highest confidence.',
                properties: {
                    contact: { type: 'number' },
                    skills: { type: 'number' },
                    experience: { type: 'number' },
                    certifications: { type: 'number' },
                    education: { type: 'number' },
                    overall: { type: 'number' },
                },
                required: ['contact', 'skills', 'experience', 'certifications', 'education', 'overall'],
            },
        },
        required: ['contact', 'skills', 'experiences', 'certifications', 'education', 'confidenceScores'],
    },
};
