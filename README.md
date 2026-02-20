# The Civic Micro-Task Platform

Welcome to the team repository for **The Civic Micro-Task Platform**! This repository is specially structured as a monorepo with 5 isolated workstreams. This allows our 5-person team to work simultaneously with minimal Git conflicts while maintaining strict integration points.

## 📁 Repository Architecture & Team Member Roles

To ensure smooth integration and modularity, please develop your features ONLY inside your assigned folder. The UI components will accept data props to allow seamless population from the backend databases.

### ⚙️ Workstreams

#### `/01_UI_Architect`
**Focus:** Branding & Profiles
* Design implementation of the *Lion* (Users), *Bird* (NGO/Govt), and *Snake* (Footer/System) motifs.
* **Volunteer Profile:** Grid layout for Posts, Comments, About, displaying XP, Timeline, and Badges.
* **Organization Profile:** Banner, Verification Tick, current project stats.

#### `/02_Feature_Logic`
**Focus:** Issue Workflow & Applications
* **Raise Issue:** Form handling Name, Description, Upvotes, and threaded Comments.
* **Organization Tagging:** Allow tagging specific organizations for intervention.
* **Job Board Applications:** The volunteer view to see job details, participants, and apply.

#### `/03_Backend_Auth`
**Focus:** Authentication, Gamification & Funding
* **Dual-Tier Registration:** Separate paths for Volunteers and Organizations.
* **Data Integrity:** Backend calculation of XP and Achievements.
* **Direct Funding:** Communication portal/bridge for volunteers requesting financial support.

#### `/04_GIS_Media`
**Focus:** Spatial Mapping & Verification
* **Live Map:** Google Maps integration for displaying scheduled/active project pins.
* **Media Verification:** Mandatory extraction of EXIF/Geotag data from media uploads to prevent fraudulent reports.

#### `/05_Systems_AI`
**Focus:** Intelligence, Proximity & Dynamic Engines
* **Geo-Fencing:** Notification engine triggering alerts for nearby issues.
* **NGO Questionnaire Engine:** Building the dynamic mini-form engine for NGO job posts.
* **AI Requirements Estimation:** AI integration suggesting volunteer count and time based on issue descriptions.

#### `/shared_assets`
* Shared icons, base CSS layers, and typography rules.

---

## 🚀 How to Work in This Repository

1. **Pull the latest code:**
   ```bash
   git pull origin main
   ```
2. **Work inside your folder:** Create your files, screens, and components ONLY inside your assigned folder.
3. **Commit your changes:**
   ```bash
   git add [YOUR_WORKSTREAM_FOLDER]/
   git commit -m "feat: Completed profile grids"
   ```
4. **Push your code:**
   ```bash
   git push origin main
   ```
