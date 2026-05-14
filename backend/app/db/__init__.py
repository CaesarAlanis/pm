from app.db.connection import ensure_db, DB_PATH
from app.db.board import get_board, get_boards_for_user, get_board_by_id, create_board, delete_board, update_board_title, apply_board_update, archive_board, unarchive_board, toggle_board_favorite, update_board_description
from app.db.column import rename_column, add_column, delete_column
from app.db.card import add_card, update_card, delete_card, move_card, search_cards
from app.db.member import add_board_member, remove_board_member, get_board_members, user_can_access_board, log_activity, get_activity_log
from app.db.comment import add_comment, get_comments_for_card, update_comment, delete_comment
from app.db.assignee import assign_user_to_card, unassign_user_from_card, get_card_assignees
from app.db.checklist import add_checklist, get_checklists_for_card, delete_checklist, add_checklist_item, toggle_checklist_item, delete_checklist_item
from app.db.notification import create_notification, get_notifications_for_user, mark_notification_read, mark_all_notifications_read
from app.db.template import seed_templates, get_templates, get_template_by_id
from app.db.attachment import add_attachment, get_attachments_for_card, delete_attachment
from app.db.card_link import add_card_link, remove_card_link, get_card_links
from app.db.time_log import log_time, get_time_logs_for_card, delete_time_log, get_total_logged_hours
from app.db.user import list_users, get_user_stats, count_users
from app.db.board_settings import update_board_settings
from app.db.sprint import create_sprint, get_sprints, get_sprint, update_sprint, assign_card_to_sprint, remove_card_from_sprint
from app.db.milestone import create_milestone, get_milestones, update_milestone, delete_milestone

__all__ = [
    "ensure_db",
    "DB_PATH",
    "get_board",
    "get_boards_for_user",
    "get_board_by_id",
    "create_board",
    "delete_board",
    "update_board_title",
    "apply_board_update",
    "archive_board",
    "unarchive_board",
    "toggle_board_favorite",
    "update_board_description",
    "rename_column",
    "add_column",
    "delete_column",
    "add_card",
    "update_card",
    "delete_card",
    "move_card",
    "search_cards",
    "add_board_member",
    "remove_board_member",
    "get_board_members",
    "user_can_access_board",
    "log_activity",
    "get_activity_log",
    "add_comment",
    "get_comments_for_card",
    "update_comment",
    "delete_comment",
    "assign_user_to_card",
    "unassign_user_from_card",
    "get_card_assignees",
    "add_checklist",
    "get_checklists_for_card",
    "delete_checklist",
    "add_checklist_item",
    "toggle_checklist_item",
    "delete_checklist_item",
    "create_notification",
    "get_notifications_for_user",
    "mark_notification_read",
    "mark_all_notifications_read",
    "seed_templates",
    "get_templates",
    "get_template_by_id",
    "add_attachment",
    "get_attachments_for_card",
    "delete_attachment",
    "add_card_link",
    "remove_card_link",
    "get_card_links",
    "log_time",
    "get_time_logs_for_card",
    "delete_time_log",
    "get_total_logged_hours",
    "list_users",
    "get_user_stats",
    "count_users",
    "update_board_settings",
    "create_sprint",
    "get_sprints",
    "get_sprint",
    "update_sprint",
    "assign_card_to_sprint",
    "remove_card_from_sprint",
    "create_milestone",
    "get_milestones",
    "update_milestone",
    "delete_milestone",
]
