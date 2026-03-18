# Project Title

Graduate Management System & Website - The Movement for Equal Leadership



## Contents

- [Overview](#overview) • [Non‑Profit](#non-profit) • [Team](#team) • [Quick start](#quick-start) • [Handover](#handover) • [Privacy](#privacy) • [Contacts](#contacts)



## Overview

This project provides a comprehensive technological solution for "The Movement for Equal Leadership," an NGO with a decade of experience promoting young women's public and political leadership. The project has two main focuses:

1. **Graduate Management System (Critical Priority):** A centralized internal platform to manage graduate data across different programs (like "Young Women Politicians"). It will replace manual Excel tracking, enable long-term tracking for the NGO, and serve as a secure graduate-to-graduate networking "search engine."

2. **Informational Website (Secondary Priority):** A digital presence and landing page to tell the NGO's story and feature the new "Equal Leadership" program.



**Main Features:(w emojis)**

- 🔍 **Graduate Search Engine:** Secure, internal directory for alumni networking.

- 🏷️ **Peer-Matching:** Filter graduates by specialties and interest tags.

- 💬 **Safe Communication:** WhatsApp integration with strict approval-based contact sharing.

- 📊 **Admin Tracking:** Cohort and engagement tracking for NGO fundraising.



## Non‑Profit

- **Organization:** The Movement for Equal Leadership (התנועה למנהיגות שווה)

- **Primary stakeholder(s):** Nitzan Senior Schneior — Program Manager — ANITZAN86@GMAIL.COM | 058-6277762

- **Key deliverable for them:** A secure web application with strict permission levels, featuring graduate profiles, peer-matching based on tags, and WhatsApp integration. Additionally, an informational website. The NGO is in a developmental stage regarding budget, so the solution must be sustainable and easy to maintain.



## Team

- Joelle Zanbil (Team Lead) - joelleza - joellezanbil2911@gmail.com - 215037862 

- Salman Nairoukh — SalmanNa — 326084506

- Shahd Karawi - Shahdka02 - 213324270

- abed abuserrieh -abedab - 213695380 



## Quick start (local)

1. git clone https://github.com/<org>/<repo>.git

2. cd <repo>

3. cp .env.example .env  # edit values

4. npm install

5. npm run dev

Open http://localhost:3000



(Or: docker-compose up --build)



## Frontend Structure

The frontend is organized into:

- components: reusable UI elements

- pages: main views/screens

- services: API and data logic

- assets: static files such images, fonts, and icons

  

## Demo / Deployment

- Deployed app: https://your-app.example.com  

- CI: GitHub Actions (push → deploy)



## Handover (minimum)

- [ ] Deployed URL + admin credentials (shared securely)  

- [ ] HANDOVER.md with maintenance steps  

- [ ] Add non‑profit staff as repo collaborators or transfer repo



## Privacy & Security

Due to the NGO's emphasis on a safe space, strict privacy constraints are critical:

- The system is an internal tool for graduates and admins only.

- Only minimal public fields are visible (first name, workplace, WhatsApp link).

- Full contact information (email/phone) is only revealed if the receiving graduate explicitly approves the request.

- Never commit secrets; use environment variables and GitHub secrets.



## Known limitations

- The core focus is graduate management; there is no complex built-in events module (external links to the existing NGO website will be used).

- Communication between graduates is handled via WhatsApp integration rather than an in-system chat.



## Contacts

- Project lead: Joelle Zanbil — joellezanbil2911@gmail.com  

- Non‑profit contact: Nitzan Senior Schneior — ANITZAN86@GMAIL.COM / 058-6277762

- Instructor / TA: (pls fill it idk the name of the instructor)



## License

MIT License
