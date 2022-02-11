import * as React from 'react';
import { IControlViewSharedState, IMainViewSharedState } from '../types';
import Switch from '@mui/material/Switch';
import { selectorFactory } from '../tools';

interface IProps {
  clientId: string;
  controlViewState: IControlViewSharedState;
  mainViewState: IMainViewSharedState;
  onSelectedWarpChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onWarpActivationChange: (e: boolean) => void;
  onWarpFactorChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onWarpUseNormalChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onWarpNormalAxisChange: (value: number[]) => void;
}

interface IStates {
  clientId: string;
  normalX: number;
  normalY: number;
  normalZ: number;
}

const INPUT_STYLE = {
  width: '100%',
  display: 'flex',
  justifyContent: 'space-between',
  marginBottom: '5px'
};
export default class WrapPanel extends React.Component<IProps, IStates> {
  constructor(props: IProps) {
    super(props);
    this.state = {
      clientId: this.props.clientId,
      normalX: 0,
      normalY: 0,
      normalZ: 1
    };
  }

  onNormalChange = (ax: 'X' | 'Y' | 'Z', value: number): void => {
    this.setState(old => ({ ...old, [`normal${ax}`]: value }));
    this.props.onWarpNormalAxisChange([
      this.state.normalX,
      this.state.normalY,
      this.state.normalZ
    ]);
  };

  render(): React.ReactNode {
    const warpSelectorData = [{ value: ':', label: 'None' }].concat(
      this.props.mainViewState.colorByOptions?.filter(item => {
        return item.value.endsWith('-1')
      }) ?? []
    );
    return (
      <div className="jpview-control-panel-component">
        {selectorFactory({
          defaultValue: this.props.controlViewState.selectedWarp,
          options: warpSelectorData,
          onChange: this.props.onSelectedWarpChange,
          label: 'Warp by'
        })}
        <div
          className="jpview-input-wrapper"
          style={{ flexDirection: 'column' }}
        >
          <div style={INPUT_STYLE}>
            <label>Scale factor</label>
            <input
              className="jpview-input"
              type="number"
              style={{ width: '25%' }}
              value={this.props.controlViewState.warpFactor ?? 0}
              onChange={this.props.onWarpFactorChange}
              // step={step}
              disabled={!this.props.controlViewState.enableWarp}
            />
          </div>
          <div style={INPUT_STYLE}>
            <label>Use normal</label>
            <input
              className="jpview-input"
              type="checkbox"
              style={{ width: 'auto' }}
              disabled={!this.props.controlViewState.enableWarp}
              checked={!!this.props.controlViewState.warpNormal}
              onChange={this.props.onWarpUseNormalChange}
            />
          </div>
          <div style={INPUT_STYLE}>
            {['X', 'Y', 'Z'].map(ax => {
              return (
                <input
                  style={{ width: '25%' }}
                  className="jpview-input"
                  key={ax}
                  placeholder={ax}
                  disabled={
                    !this.props.controlViewState.enableWarp ||
                    !this.props.controlViewState.warpNormal
                  }
                  value={this.state[`normal${ax}`]}
                  onChange={e => {
                    this.onNormalChange(
                      ax as 'X' | 'Y' | 'Z',
                      Number(e.target.value)
                    );
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>
    );
  }
}
