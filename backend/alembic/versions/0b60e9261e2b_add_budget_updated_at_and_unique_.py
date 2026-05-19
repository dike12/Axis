"""add_budget_updated_at_and_unique_constraint

Revision ID: 0b60e9261e2b
Revises: f8574bdc7d26
Create Date: 2026-05-04 02:31:00.008636

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0b60e9261e2b'
down_revision: Union[str, Sequence[str], None] = 'f8574bdc7d26'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Step 1: Add as nullable so existing rows don't violate the constraint
    op.add_column('budget_categories', sa.Column('updated_at', sa.DateTime(), nullable=True))
    op.add_column('budget_values', sa.Column('updated_at', sa.DateTime(), nullable=True))

    # Step 2: Backfill existing rows using created_at as a sensible default
    op.execute("UPDATE budget_categories SET updated_at = created_at WHERE updated_at IS NULL")
    op.execute("UPDATE budget_values SET updated_at = created_at WHERE updated_at IS NULL")

    # Step 3: Now safe to enforce NOT NULL
    op.alter_column('budget_categories', 'updated_at', nullable=False)
    op.alter_column('budget_values', 'updated_at', nullable=False)

    # Step 4: Unique constraint (separate from the column changes)
    op.create_unique_constraint('uq_budget_value_per_month', 'budget_values', ['user_id', 'category_id', 'year', 'month'])


def downgrade() -> None:
    op.drop_constraint('uq_budget_value_per_month', 'budget_values', type_='unique')
    op.drop_column('budget_values', 'updated_at')
    op.drop_column('budget_categories', 'updated_at')