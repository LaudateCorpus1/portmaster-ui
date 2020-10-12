import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { RiskLevel } from '../../services';

@Component({
  selector: 'app-count-indicator',
  templateUrl: './count-indicator.html',
  styleUrls: ['./count-indicator.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CountIndicatorComponent {
  @Input()
  count: number = 0;

  @Input()
  risk: RiskLevel = RiskLevel.Off;
}
