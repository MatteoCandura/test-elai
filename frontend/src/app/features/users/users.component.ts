import { Component, inject, signal, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UsersStore, UserAdmin } from '@store/users.store';
import AlertComponent from '@components/alert.component';
import Icon from '@components/icon.component';
import AuthStore from '@store/auth.store';

@Component({
  selector: 'app-users',
  imports: [DatePipe, FormsModule, AlertComponent, Icon],
  host: {
    class: 'relative',
  },
  template: `
    @if (!!successMessage() || !!usersStore.error()) {
      <div class="absolute top-0 z-10 space-y-2 w-full">
        <app-alert [show]="!!successMessage()" (onHide)="successMessage.set(null)" type="success">{{
          successMessage()
        }}</app-alert>
        <app-alert [show]="!!usersStore.error()" type="error">{{ usersStore.error() }}</app-alert>
      </div>
    }

    <div class="space-y-6">
      <h1 class="text-2xl font-bold">Gestione utenti</h1>
      <div class="mb-4">
        <input
          type="search"
          placeholder="Cerca utente..."
          class="input input-bordered input-sm w-full max-w-xs"
          [value]="usersStore.searchTerm()"
          (input)="onSearch($event)"
        />
      </div>

      <div class="shadow-sm overflow-x-auto rounded-box border border-base-content/5 bg-base-100">
        <table class="table table-zebra">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Email</th>
              <th>Permessi</th>
              <th>Registrato il</th>
              <th class="text-right">Azioni</th>
            </tr>
          </thead>
          <tbody>
            @for (user of usersStore.filteredUsers(); track user._id) {
              <tr>
                <td>{{ user.name }}</td>
                <td>{{ user.email }}</td>
                <td>
                  <div class="flex flex-wrap gap-1">
                    @for (perm of user.permissions; track perm) {
                      <span class="badge badge-sm badge-primary">{{ permissionLabel(perm) }}</span>
                    }
                    @if (user.permissions.length === 0) {
                      <span class="text-gray-400 text-xs italic">Nessun permesso</span>
                    }
                  </div>
                </td>
                <td>{{ user.createdAt | date: 'dd/MM/yyyy HH:mm' }}</td>
                <td class="text-right">
                  <div class="flex justify-end gap-1">
                    <button class="btn btn-ghost btn-xs" (click)="openEditModal(user)">
                      <app-icon name="user-edit" size="sm" />
                    </button>
                    <button class="btn btn-ghost btn-xs" (click)="openPermissionsModal(user)">
                      <app-icon name="user-settings" size="sm" />
                    </button>
                    @if (!isSelf(user)) {
                      <button class="btn btn-ghost btn-xs" (click)="deletingUser.set(user)">
                        <app-icon name="delete" size="sm" />
                      </button>
                    }
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modale Modifica -->
    @if (editingUser()) {
      <dialog class="modal modal-open">
        <div class="modal-box">
          <h3 class="text-lg font-bold mb-4">Modifica utente</h3>
          <div class="space-y-4">
            <div>
              <label class="label pt-0"><span class="label-text">Nome</span></label>
              <input type="text" class="input input-bordered w-full" [(ngModel)]="editName" />
            </div>
            <div>
              <label class="label"><span class="label-text">Email</span></label>
              <input type="email" class="input input-bordered w-full" [(ngModel)]="editEmail" />
            </div>
          </div>
          <div class="modal-action">
            <button class="btn" (click)="editingUser.set(null)">Annulla</button>
            <button class="btn btn-primary" (click)="saveEdit()" [disabled]="isSaving()">
              {{ isSaving() ? 'Salvataggio...' : 'Salva' }}
            </button>
          </div>
        </div>
      </dialog>
    }

    <!-- Modale Permessi -->
    @if (permissionsUser()) {
      <dialog class="modal modal-open">
        <div class="modal-box">
          <h3 class="text-lg font-bold mb-4">Permessi di {{ permissionsUser()!.name }}</h3>
          <div class="space-y-3">
            @for (perm of allPermissions; track perm.key) {
              <label class="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  class="checkbox checkbox-primary checkbox-sm"
                  [checked]="permissionsSelection().includes(perm.key)"
                  [disabled]="isPermissionDisabled(perm.key)"
                  (change)="togglePermission(perm.key)"
                />
                <span class="text-sm">{{ perm.label }}</span>
              </label>
            }
          </div>
          <div class="modal-action">
            <button class="btn" (click)="permissionsUser.set(null)">Annulla</button>
            <button class="btn btn-primary" (click)="savePermissions()" [disabled]="isSaving()">
              {{ isSaving() ? 'Salvataggio...' : 'Salva permessi' }}
            </button>
          </div>
        </div>
      </dialog>
    }

    <!-- Conferma Delete -->
    @if (deletingUser()) {
      <dialog class="modal modal-open">
        <div class="modal-box">
          <h3 class="text-lg font-bold mb-4">Elimina utente</h3>
          <p>
            Sei sicuro di voler eliminare <strong>{{ deletingUser()!.name }}</strong
            >?
          </p>
          <div class="modal-action">
            <button class="btn" (click)="deletingUser.set(null)">Annulla</button>
            <button class="btn btn-error" (click)="executeDelete()" [disabled]="isSaving()">
              {{ isSaving() ? 'Eliminazione...' : 'Elimina' }}
            </button>
          </div>
        </div>
      </dialog>
    }
  `,
})
export default class UsersComponent implements OnInit {
  protected readonly usersStore = inject(UsersStore);
  private readonly authStore = inject(AuthStore);

  protected readonly allPermissions = [
    { key: 'view_all', label: 'Visualizza tutti i file' },
    { key: 'delete_all', label: 'Elimina tutti i file' },
    { key: 'edit_all', label: 'Modifica tutti i file' },
    { key: 'manage_users', label: 'Gestione utenti' },
  ];

  protected editName = '';
  protected editEmail = '';

  protected editingUser = signal<UserAdmin | null>(null);
  protected permissionsUser = signal<UserAdmin | null>(null);
  protected deletingUser = signal<UserAdmin | null>(null);
  protected successMessage = signal<string | null>(null);
  protected isSaving = signal(false);
  protected permissionsSelection = signal<string[]>([]);

  ngOnInit() {
    this.usersStore.loadUsers();
  }

  onSearch(event: Event) {
    const val = (event.target as HTMLInputElement).value;
    this.usersStore.setSearchTerm(val);
  }

  isSelf(user: UserAdmin): boolean {
    return user._id === this.authStore.user()?.id;
  }

  permissionLabel(key: string): string {
    return this.allPermissions.find((p) => p.key === key)?.label ?? key;
  }

  openEditModal(user: UserAdmin) {
    this.editingUser.set(user);
    this.editName = user.name;
    this.editEmail = user.email;
  }

  saveEdit() {
    const user = this.editingUser();
    if (!user) return;

    this.isSaving.set(true);
    this.usersStore
      .updateUser(user._id, { name: this.editName, email: this.editEmail })
      .subscribe((success) => {
        this.isSaving.set(false);
        if (success) {
          this.editingUser.set(null);
          this.showSuccess(`Utente ${this.editName} aggiornato`);
        }
      });
  }

  openPermissionsModal(user: UserAdmin) {
    this.permissionsUser.set(user);
    this.permissionsSelection.set([...user.permissions]);
  }

  isPermissionDisabled(key: string): boolean {
    const user = this.permissionsUser();
    return key === 'manage_users' && !!user && this.isSelf(user);
  }

  togglePermission(key: string) {
    this.permissionsSelection.update((perms) =>
      perms.includes(key) ? perms.filter((p) => p !== key) : [...perms, key],
    );
  }

  savePermissions() {
    const user = this.permissionsUser();
    if (!user) return;

    this.isSaving.set(true);
    this.usersStore
      .updatePermissions(user._id, this.permissionsSelection())
      .subscribe((success) => {
        this.isSaving.set(false);
        if (success) {
          this.permissionsUser.set(null);
          this.showSuccess(`Permessi di ${user.name} aggiornati`);
        }
      });
  }

  executeDelete() {
    const user = this.deletingUser();
    if (!user) return;

    this.isSaving.set(true);
    this.usersStore.deleteUser(user._id).subscribe((success) => {
      this.isSaving.set(false);
      if (success) {
        this.deletingUser.set(null);
        this.showSuccess(`Utente ${user.name} eliminato`);
      }
    });
  }

  private showSuccess(msg: string) {
    this.successMessage.set(msg);
    setTimeout(() => this.successMessage.set(null), 4000);
  }
}
