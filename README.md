# SoC BC18: Final Hackathon Project

### ShelfLife

![logoPlaceholder](https://github.com/user-attachments/assets/31b6917e-0fb8-400f-89ba-b8cea445d989)

**An app that helps track food expiry dates, cut waste, and prevent overbuying**

**Deployed link:** https://shelf-life-opal.vercel.app/
**Presentation link:** https://www.canva.com/design/DAGg2mvaSpA/6OBXUrcLsHnreVolcMEqRQ/view?utm_content=DAGg2mvaSpA&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=he872c538b4

---

## Table of Contents

- [Problem Statement](#problem-statement)
- [Solution](#solution)
- [Tech Stack](#tech-stack)
- [Setup & Installation](#setup--installation)
- [Features](#features)
- [Challenges & Learnings](#challenges--learnings)
- [Future Improvements](#future-improvements)
- [Contributors](#contributors)

---

## Problem Statement

One-third of all food globally is wasted, with the UK discarding 9.52 million tonnes annually—70% from households. This waste could feed 30 million people, yet 8.4 million face food poverty, costing households £470 yearly. Our app helps reduce waste by keeping users informed on when their food will expire which also has the benefit of preventing users over-buying, thus reducing food waste.

“Waste less, taste more!”

---

## Solution

ShelfLife notifies users about upcoming expiry dates, categorises ingredients for easy tracking, and integrates AI-powered recipe suggestions to make the most of available food. This helps prevent waste, save money, and promote sustainable consumption.

## Tech Stack

**Frontend:**

- Next.js - React framework
- React - UI library
- CSS Modules - For styling
- Animate.css - For animations
- TypeScript - For type safety
- Vercel v0 - Initial Bare-Bones Setup

  **Backend:**

- Node.js - JavaScript runtime environment
- PostgreSQL - Relational database management system
- OpenAI (gpt-3.5-turbo) - AI language model API

**Authentication:**

- Supabase - Backend-as-a-service (BaaS)

**Testing:**

- Vitest - Unit testing framework
- Playwright - End-to-end testing framework

**Deployment:**

- Vercel - Frontend deployment platform
- Supabase - Backend platform

---

## Setup & Installation

1️⃣ Clone this repo:

```bash

git clone https://github.com/BC18-Shelf-Life/Shelf-Life.git
cd Shelf-Life

```

2️⃣ Install dependencies:

```bash

npm install

```

3️⃣ Start the development server:

```bash

npm run dev

```

---

## Features

- **User authentication** with Supabase
- **Fun visual animations** for a better UX
- **Store your perishable goods in our fridge for helpful reminders**
- **Ingredient categories** categorise your ingredients by dairy, meat, fruit and more...
- **Generate recipes with assistance from an AI** the AI will only use items you request and find recipes with those ingredients

---

## Challenges & Learnings

 **Key Takeaways:**

- Connecting the **frontend to the backend** was challenging as Supabase was a new technology, but we gained a solid understanding of authentication and database integration.  
- Ensuring all **features linked seamlessly** required troubleshooting API calls and state management, which helped us improve our debugging and problem-solving skills.  
- Executing all of our plans within just **two coding days** required an agile mindset, pushing us to prioritise tasks efficiently, work collaboratively under pressure, and adapt quickly to challenges as they arose. 

## Future Improvements

- **Barcode Scanner Integration** – Scan food items to auto-log expiry dates and autofill receipts.  
- **Smart Notifications** – Personalized reminders based on user preferences.  
- **Food Donation Feature** – Suggest local food banks for items near expiry.  

---

## 👥 Contributors

| Name     | Role                             | GitHub                                   |
| -------- | -------------------------------- | ---------------------------------------- |
| Louis    | Database & Frontend / Animations | [@Louis](https://github.com/L-Brookling) |
| Holly    | Backend & AI                     | [@Holly](https://github.com/Holl4444)    |
| Danielle | Backend & AI                     | [@Dani](https://github.com/daniellem62)  |
| Nasrin   | DevOps & Frontend & Playwright   | [@Nas](https://github.com/Nas1010)       |
| Sam      | Backend & DevOps                 | [@Sam](https://github.com/samannetts8)   |
| Owen     | Frontend & Testing               | [@Owen](https://github.com/Oweshbin)     |

---

## Why This Matters

- **What impact does your project have in the real world?**

> Our app helps reduce food waste by reminding users of expiry dates, preventing unnecessary purchases, and encouraging mindful consumption. By cutting household waste, it not only saves users money but also supports the fight against food poverty and reduces environmental impact.
