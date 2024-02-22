import { connect } from 'react-redux';

import { fetchRelationships } from 'mastodon/actions/accounts';

import { openDropdownMenu, closeDropdownMenu } from '../actions/dropdown_menu';
import { openModal, closeModal } from '../actions/modal';
import ReactionDropdownMenu from '../components/reaction_dropdown_menu';
import { isUserTouching } from '../is_mobile';

const mapStateToProps = state => ({
  openDropdownId: state.getIn(['dropdown_menu', 'openId']),
  openedViaKeyboard: state.getIn(['dropdown_menu', 'keyboard']),
});

const mapDispatchToProps = (dispatch, { status, onReaction, scrollKey }) => ({
  onOpen(id, keyboard) {
    if (status) {
      dispatch(fetchRelationships([status.getIn(['account', 'id'])]));
    }

    dispatch(isUserTouching() ? openModal({
      modalType: 'REACTION',
      modalProps: {
        status,
        onReaction,
      }
    }) : openDropdownMenu(id, keyboard, scrollKey));
  },

  onClose(id) {
    dispatch(closeModal({
      modalType: 'REACTION',
      ignoreFocus: false,
    }));
    dispatch(closeDropdownMenu(id));
  },
});

export default connect(mapStateToProps, mapDispatchToProps)(ReactionDropdownMenu);
