"""initial schema — commesse e ore

Revision ID: 001
Revises:
Create Date: 2026-06-07
"""
from alembic import op
import sqlalchemy as sa

revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "commesse",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("nome", sa.String(255), nullable=False),
        sa.Column("codice", sa.String(100), nullable=True),
        sa.Column("budget_ore", sa.Numeric(8, 2), nullable=True),
        sa.Column("budget_euro", sa.Numeric(12, 2), nullable=True),
        sa.Column("created_at", sa.TIMESTAMP, server_default=sa.func.now()),
    )
    op.create_table(
        "sottocommesse",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("commessa_id", sa.Integer, sa.ForeignKey("commesse.id", ondelete="CASCADE"), nullable=False),
        sa.Column("nome", sa.String(255), nullable=False),
        sa.Column("lettera", sa.String(5), nullable=True),
    )
    op.create_table(
        "commessa_ditte",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("commessa_id", sa.Integer, sa.ForeignKey("commesse.id", ondelete="CASCADE"), nullable=False),
        sa.Column("ditta_id", sa.Integer, nullable=False),
    )
    op.create_table(
        "commessa_referenti",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("commessa_id", sa.Integer, sa.ForeignKey("commesse.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.Integer, nullable=False),
    )
    op.create_table(
        "commessa_assegnatari",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("commessa_id", sa.Integer, sa.ForeignKey("commesse.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.Integer, nullable=False),
        sa.Column("sottocommessa_id", sa.Integer, sa.ForeignKey("sottocommesse.id", ondelete="CASCADE"), nullable=True),
    )
    op.create_table(
        "registrazioni_ore",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer, nullable=False),
        sa.Column("commessa_id", sa.Integer, sa.ForeignKey("commesse.id", ondelete="CASCADE"), nullable=False),
        sa.Column("sottocommessa_id", sa.Integer, sa.ForeignKey("sottocommesse.id", ondelete="SET NULL"), nullable=True),
        sa.Column("booking_id", sa.Integer, nullable=True),  # nessuna FK cross-service
        sa.Column("data", sa.Date, nullable=False),
        sa.Column("ore", sa.Numeric(4, 2), nullable=False),
        sa.Column("descrizione", sa.String(500), nullable=False, server_default=""),
        sa.Column("smartworking", sa.Boolean, nullable=False, server_default="0"),
        sa.Column("created_at", sa.TIMESTAMP, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("registrazioni_ore")
    op.drop_table("commessa_assegnatari")
    op.drop_table("commessa_referenti")
    op.drop_table("commessa_ditte")
    op.drop_table("sottocommesse")
    op.drop_table("commesse")
