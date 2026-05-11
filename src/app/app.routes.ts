import { Routes } from '@angular/router';
import { Login } from './auth/login/login';
import { Admin } from './admin/admin';
import { HRBP } from './hrbp/hrbp';
import { Manager } from './manager/manager';
import { Direction } from './direction/direction';
import { authGuard } from './auth/auth.guard';
import { PracticeList } from './admin/practices/practice-list/practice-list';
import { PracticeCollaborators } from './admin/practices/practice-collaborators/practice-collaborators';
import { ListCollaborators } from './hrbp/collaborators/list-collaborators/list-collaborators';
import { CreateSurvey } from './admin/surveys/create-survey/create-survey';
import { MySurveys } from './collab/surveys/my-surveys/my-surveys';
import { Collab } from './collab/collab';
import { MyBadges } from './collab/badges/my-badges/my-badges';
import { AddUser } from './admin/userManagement/add-user/add-user';
import { EditUser } from './admin/userManagement/edit-user/edit-user';
import { UserManagementList } from './admin/userManagement/user-management-list/user-management-list';
import { Userprofile } from './admin/userManagement/userprofile/userprofile';
import { UpdateSelfProfile } from './update-self-profile/update-self-profile';
import { PointsList } from './hrbp/points/points-list/points-list';
import { AddPoint } from './hrbp/points/add-point/add-point';
import { PointDetail } from './hrbp/points/point-detail/point-detail';
import { UpdatePoint } from './hrbp/points/update-point/update-point';
import { EquipeManager } from './manager/equipe-manager/equipe-manager';
import { CollaboratorSatisfaction } from './collab/satisfaction/collaborator-satisfaction/collaborator-satisfaction';
import { EquipeSatisfaction } from './hrbp/satisfaction/equipe-satisfaction/equipe-satisfaction';
import { DashboardCollab } from './collab/dashboard-collab/dashboard-collab';
import { DashboardManager } from './manager/dashboard-manager/dashboard-manager';
import { DashboardHRBP } from './hrbp/dashboard-hrbp/dashboard-hrbp';
import { HrbpRequests } from './hrbp/hrbp-requests/hrbp-requests';
import { CollabPoints } from './collab/collab-points/collab-points';
import { DashboardDirection } from './direction/dashboard-direction/dashboard-direction';
import { UserImportComponent } from './admin/user-import/user-import';
import { PointsCalendar } from './hrbp/points/points-calendar/points-calendar';
import { DashboardAdmin } from './admin/dashboard-admin/dashboard-admin';
import { ManagerPoints } from './manager/manager-points/manager-points';
import { CreateSurveyManager } from './manager/create-survey-manager/create-survey-manager';
import { ManagerAlertsComponent } from './manager/manager-alerts/manager-alerts-component/manager-alerts-component';
import { ProjectList } from './admin/project/project-list/project-list';

export const routes: Routes = [
  { path: 'login', component: Login },
  { path: 'practices-test', component: PracticeList },
  { path: 'survey-test', component: CreateSurvey },
  { path: 'surveys', component: MySurveys },

  { path: 'admin', component: Admin,
     canActivate: [authGuard], 
     data: { role: 'ADMIN_RH' },
        children: [
      { path: '', redirectTo: 'UserManagement', pathMatch: 'full' },
      { path: 'practices', component: PracticeList },
      { path: 'practices/:id/collaborators', component: PracticeCollaborators },
      { path: 'surveys/create', component: CreateSurvey },

      { path: 'UserManagement', component: UserManagementList },
      { path: 'users/:id', component: Userprofile},
      { path: 'editUser/:id', component: EditUser},
      { path: 'addUser', component: AddUser},
      { path: 'SelfProfile/:id', component: UpdateSelfProfile},
      { path: 'dashboardAdmin', component: DashboardAdmin},
      { path: 'employees-import', component: UserImportComponent },

      {path: 'practices/:practiceId/projects',component: ProjectList},
      { path: 'projects', component: ProjectList },

        ]
     },

  // HRBP ROUTES
{
    path: 'hrbp',
    component: HRBP,
    canActivate: [authGuard],
    data: { role: 'HRBP' },
    children: [
      { path: '', redirectTo: 'calendar', pathMatch: 'full' },
      { path: 'collaborators', component: ListCollaborators },
      { path: 'practices/:id/collaborators', component: ListCollaborators },
      { path: 'points', component: PointsList },
      { path: 'points/:id', component: PointDetail },
      { path: 'addPoint', component: AddPoint },
      { path: 'updatePoint/:id', component: UpdatePoint },
      { path: 'equipe-satisfaction', component: EquipeSatisfaction },
      { path: 'SelfProfile/:id', component: UpdateSelfProfile },
      { path: 'dashboardHRBP', component: DashboardHRBP},
      { path: 'requests', component: HrbpRequests },
       { path: 'calendar', component: PointsCalendar },


    ]
  },


  { path: 'manager',
    component: Manager, 
    canActivate: [authGuard],
    data: { role: 'MANAGER' },
      children: [
    { path: '', redirectTo: 'equipe', pathMatch: 'full' },
    { path: 'equipe', component: EquipeManager },
    { path: 'SelfProfile/:id', component: UpdateSelfProfile },
    { path: 'dashboardManager', component: DashboardManager},
    { path: 'points', component: ManagerPoints },
    { path: 'surveys/create', component: CreateSurveyManager },
    { path: ':managerId/alerts', component: ManagerAlertsComponent },


  ]
    },
{
  path: 'collab',
  component: Collab,
  canActivate: [authGuard],
  data: { role: 'COLLABORATOR' },
  children: [
    { path: '',redirectTo: 'satisfaction', pathMatch: 'full' },
    { path: 'surveys', component: MySurveys },
    { path: 'badges', component: MyBadges },
    { path: 'satisfaction', component: CollaboratorSatisfaction },
    { path: 'SelfProfile/:id', component: UpdateSelfProfile },
    { path: 'dashboardCollab', component: DashboardCollab},
    { path: 'points', component: CollabPoints },

  ]
},
  { path: 'direction', 
    component: Direction, 
    canActivate: [authGuard], 
    data: { role: 'DIRECTION_RH' },
    children: [
    { path: '',redirectTo: 'dashboardDirection', pathMatch: 'full' },
    { path: 'dashboardDirection', component: DashboardDirection },


  ] },

  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: '**', redirectTo: 'login' } // fallback for unknown routes
];
