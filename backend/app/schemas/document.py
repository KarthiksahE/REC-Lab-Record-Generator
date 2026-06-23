from pydantic import BaseModel, Field, HttpUrl
from typing import List, Optional

class ExperimentSchema(BaseModel):
    title: str = Field(..., description="Title of the experiment")
    date: Optional[str] = Field("", description="Date of the experiment in format dd-mm-yyyy or similar")
    github_url: Optional[str] = Field("", description="GitHub repository or file link for the experiment code")

class DocumentGenerateSchema(BaseModel):
    course_code: str = Field(..., description="Course code, e.g. 19AI410")
    course_name: str = Field(..., description="Course name, e.g. Introduction to Machine Learning")
    student_name: str = Field(..., description="Full name of the student")
    register_number: str = Field(..., description="Register number of the student")
    department: str = Field(..., description="Branch/Department, e.g. CSE or AIDS")
    year: str = Field(..., description="Year of study, e.g. I, II, III, IV")
    semester: str = Field(..., description="Semester of study, e.g. I to VIII")
    academic_year: str = Field(..., description="Academic year, e.g. 2025-2026")
    faculty: Optional[str] = Field("", description="Name of the faculty member in-charge")
    lab_name: Optional[str] = Field("", description="Name of the laboratory course")
    institution: Optional[str] = Field("", description="Name of the institution, e.g. Rajalakshmi Engineering College")
    experiments: List[ExperimentSchema] = Field(default=[], description="List of experiments to populate in the index")
