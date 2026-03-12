# Database Schema

Database

Supabase PostgreSQL

---

# Tables

users

id  
email  
role

---

contractor_companies

id  
user_id  
company_name  
tax_id  
address  
bank_info  
status

---

contractor_team_members

id  
company_id  
name  
role  
certifications

---

insurance_policies

id  
company_id  
policy_number  
expiration_date  
status

---

certifications

id  
company_id  
type  
expiration_date  
status

---

jobs

id  
customer_id  
title  
description  
location  
budget

---

job_applications

id  
job_id  
contractor_id  
status