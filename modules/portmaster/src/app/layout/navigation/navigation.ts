import { ConnectedPosition } from '@angular/cdk/overlay';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, OnInit, Output } from '@angular/core';
import { DebugAPI, PortapiService } from '@safing/portmaster-api';
import { tap } from 'rxjs/operators';
import { AppComponent } from 'src/app/app.component';
import { NotificationsService, NotificationType, StatusService, VersionStatus } from 'src/app/services';
import { ActionIndicatorService } from 'src/app/shared/action-indicator';
import { fadeInAnimation, fadeOutAnimation } from 'src/app/shared/animations';
import { ExitService } from 'src/app/shared/exit-screen';

@Component({
  selector: 'app-navigation',
  templateUrl: './navigation.html',
  styleUrls: ['./navigation.scss'],
  exportAs: 'navigation',
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    fadeInAnimation,
    fadeOutAnimation,
  ]
})
export class NavigationComponent implements OnInit {
  /** Emits the current portapi connection state on changes. */
  readonly connected$ = this.portapi.connected$;

  /** @private The available and selected resource versions. */
  versions: VersionStatus | null = null;

  /** Whether or not we have new, unseen notifications */
  hasNewNotifications = false;

  /** The color to use for the notifcation-available hint (dot) */
  notificationColor: string = 'bg-green-300';

  /** Whether or not we have new, unseen prompts */
  hasNewPrompts = false;

  @Output()
  sideDashChange = new EventEmitter<'collapsed' | 'expanded' | 'force-overlay'>();

  /** Whether or not the side dash should be expanded or collapsed */
  sideDashStatus: 'collapsed' | 'expanded' = 'expanded';

  constructor(
    private portapi: PortapiService,
    private exitService: ExitService,
    private statusService: StatusService,
    private appComponent: AppComponent,
    private debugAPI: DebugAPI,
    private actionIndicator: ActionIndicatorService,
    private notificationService: NotificationsService,
    private cdr: ChangeDetectorRef
  ) { }

  dropDownPositions: ConnectedPosition[] = [
    {
      originX: 'end',
      originY: 'top',
      overlayX: 'start',
      overlayY: 'top'
    }
  ]

  ngOnInit() {
    const mql = window.matchMedia('(max-width: 1200px)');

    if (mql.matches) {
      this.sideDashStatus = 'collapsed';
      this.sideDashChange.next(this.sideDashStatus);
    }

    mql.addEventListener('change', () => {
      if (mql.matches) {
        this.sideDashStatus = 'collapsed';
      } else {
        this.sideDashStatus = 'expanded';
      }
      this.sideDashChange.next(this.sideDashStatus);
    })

    this.statusService.getVersions()
      .subscribe(versions => {
        this.versions = versions;
        this.cdr.markForCheck();
      });

    this.notificationService.new$
      .subscribe(notif => {
        if (notif.some(n => n.Type === NotificationType.Prompt && n.EventID.startsWith("filter:prompt"))) {
          this.hasNewPrompts = true;
        } else {
          this.hasNewPrompts = false;
        }

        if (notif.some(n => !n.EventID.startsWith("filter:prompt"))) {
          this.hasNewNotifications = true;
        } else {
          this.hasNewNotifications = false;
        }

        if (notif.some(n => n.Type === NotificationType.Error)) {
          this.notificationColor = 'bg-red-300';
        } else
          if (notif.some(n => n.Type === NotificationType.Warning)) {
            this.notificationColor = 'bg-yellow-300';
          } else {
            this.notificationColor = 'bg-green-300';
          }

        this.cdr.markForCheck();
      })
  }

  toggleSideDash(event: MouseEvent) {
    let notify: 'expanded' | 'collapsed' | 'force-overlay' = this.sideDashStatus;

    if (this.sideDashStatus === 'collapsed') {
      this.sideDashStatus = 'expanded';
      notify = 'expanded';
      if (event.shiftKey) {
        notify = 'force-overlay'
      }
    } else {
      this.sideDashStatus = 'collapsed';
      notify = 'collapsed'
    }

    this.sideDashChange.next(notify);
  }

  /**
   * @private
   * Injects a ui/reload event and performs a complete
   * reload of the window once the portmaster re-opened the
   * UI bundle.
   */
  reloadUI(_: Event) {
    this.portapi.reloadUI()
      .pipe(
        tap(() => {
          setTimeout(() => window.location.reload(), 1000)
        })
      )
      .subscribe(this.actionIndicator.httpObserver(
        'Reloading UI ...',
        'Failed to Reload UI',
      ))
  }

  /** Re-initialize the SPN */
  reinitSPN(_: Event) {
    this.portapi.reinitSPN()
      .subscribe(this.actionIndicator.httpObserver(
        'Re-initialized SPN',
        'Failed to re-initialize the SPN'
      ))
  }

  /**
   * @private
   * Clear the DNS name cache.
   */
  clearDNSCache(_: Event) {
    this.portapi.clearDNSCache()
      .subscribe(this.actionIndicator.httpObserver(
        'DNS Cache Cleared',
        'Failed to Clear DNS Cache.',
      ))
  }

  /**
   * @private
   * Trigger downloading of updates
   *
   * @param event - The mouse event
   */
  downloadUpdates(event: Event) {
    this.portapi.checkForUpdates()
      .subscribe(this.actionIndicator.httpObserver(
        'Downloading Updates ...',
        'Failed to Check for Updates',
      ))
  }

  /**
   * @private
   * Trigger a shutdown of the portmaster-core service
   */
  shutdown(_: Event) {
    this.exitService.shutdownPortmaster();
  }

  /**
   * @private
   * Trigger a restart of the portmaster-core service. Requires
   * that portmaster has been started with a service-wrapper.
   *
   * @param event The mouse event
   */
  restart(event: Event) {
    // prevent default and stop-propagation to avoid
    // expanding the accordion body.
    event.preventDefault();
    event.stopPropagation();

    this.portapi.restartPortmaster()
      .subscribe(this.actionIndicator.httpObserver(
        'Restarting ...',
        'Failed to Restart',
      ))
  }

  /**
   * @private
   * Opens the data-directory of the portmaster installation.
   * Requires the application to run inside electron.
   */
  async openDataDir(event: Event) {
    if (!!window.app) {
      const dir = await window.app.getInstallDir()
      await window.app.openExternal(dir);
    }
  }

  openChangeLog() {
    const url = "https://github.com/safing/portmaster/releases";
    if (!!window.app) {
      window.app.openExternal(url);
      return;
    }
    window.open(url, '_blank');
  }

  showIntro() {
    this.appComponent.showIntro()
  }

  resetBroadcastState() {
    this.portapi.resetBroadcastState()
      .subscribe(this.actionIndicator.httpObserver(
        'Broadcast State Cleared',
        'Failed to Reset Broadcast State.',
      ))
  }

  copyDebugInfo(event: Event) {
    // prevent default and stop-propagation to avoid
    // expanding the accordion body.
    event.preventDefault();
    event.stopPropagation();

    this.debugAPI.getCoreDebugInfo()
      .subscribe(
        async info => {
          console.log(info);
          // Copy to clip-board if supported
          if (!!navigator.clipboard) {
            await navigator.clipboard.writeText(info);
            this.actionIndicator.success("Copied to Clipboard")
          }

        },
        err => {
          console.error(err);
          this.actionIndicator.error('Failed loading debug data', err);
        }
      )
  }
}
